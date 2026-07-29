import { getSiteSettings } from '../data/site-settings.js';
import { errorResponse } from '../utils.js';

const FILE_BROWSER_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024;
const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'text/xml',
  'application/xml'
]);

function normalizeContentType(value) {
  return String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

function isInlineContentType(contentType) {
  if (!contentType) {
    return false;
  }
  if (contentType === 'application/pdf') {
    return true;
  }
  if (contentType.startsWith('image/')) {
    return contentType !== 'image/svg+xml';
  }
  if (contentType.startsWith('video/')) {
    return true;
  }
  return false;
}

function sanitizeFilename(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[/\\]/g, '_')
    .replace(/[\u0000-\u001F\u007F]/g, '');
  return cleaned.slice(0, 180) || 'file';
}

function contentDispositionValue(kind, filename) {
  const safeUtf8 = sanitizeFilename(filename);
  const safeAscii = safeUtf8
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/"/g, '')
    .trim()
    .slice(0, 150) || 'file';
  return `${kind}; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(safeUtf8)}`;
}


function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function appendOptionalParam(url, key, value) {
  const text = String(value || '').trim();
  if (text) {
    url.searchParams.set(key, text);
  }
}

function extractCfbedUrl(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  const candidates = [
    payload.url, payload.src, payload.href, payload.link, payload.fullUrl,
    payload.publicUrl, payload.data?.url, payload.data?.src, payload.data?.href,
    payload.data?.fullUrl, payload.data?.publicUrl, payload.data?.links?.url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }
  const arrays = [payload.data, payload.files, payload.images, payload.result];
  for (const value of arrays) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractCfbedUrl(item);
        if (found) return found;
      }
    }
  }
  return '';
}

async function uploadToCfbed(settings, file) {
  const baseUrl = normalizeBaseUrl(settings.cfbedBaseUrl);
  if (!baseUrl) {
    throw new Error('请先配置 CFBed 图床地址');
  }

  const uploadUrl = new URL(`${baseUrl}/api/upload`);
  appendOptionalParam(uploadUrl, 'authCode', settings.cfbedAuthCode);
  appendOptionalParam(uploadUrl, 'channel', settings.cfbedUploadChannel);
  appendOptionalParam(uploadUrl, 'channelName', settings.cfbedChannelName);
  appendOptionalParam(uploadUrl, 'folder', settings.cfbedUploadFolder);

  const form = new FormData();
  form.append('file', file, file.name);
  form.append('image', file, file.name);

  const headers = new Headers();
  if (settings.cfbedApiToken) {
    headers.set('Authorization', `Bearer ${settings.cfbedApiToken}`);
  }

  const response = await fetch(uploadUrl, { method: 'POST', headers, body: form });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    throw new Error(`CFBed 上传失败：${response.status}`);
  }
  const url = extractCfbedUrl(payload);
  if (!url) {
    throw new Error('CFBed 上传成功但未返回可访问 URL');
  }
  return {
    key: url,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    url
  };
}

function validateUpload(env, file) {
  const maxFileSize = Number(env.MAX_UPLOAD_FILE_SIZE || env.MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE);
  if (file.size > maxFileSize) {
    throw new Error(`文件大小不能超过 ${Math.round(maxFileSize / 1024 / 1024)}MB`);
  }

  const contentType = normalizeContentType(file.type);
  if (BLOCKED_MIME_TYPES.has(contentType)) {
    throw new Error('该文件类型不允许上传');
  }

  const allowed = String(env.ALLOWED_FILE_TYPES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowed.length && !allowed.some((prefix) => contentType.startsWith(prefix))) {
    throw new Error('该文件类型不允许上传');
  }
}

export function registerUploadRoutes(app) {
  app.post('/api/upload', async (c) => {
    const session = c.get('session');
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return errorResponse('请选择文件');
    }

    try {
      validateUpload(c.env, file);
    } catch (error) {
      return errorResponse(error.message);
    }

    const settings = await getSiteSettings(c.env.DB);
    if (settings.attachmentStorage === 'cfbed') {
      try {
        const cfbedFile = await uploadToCfbed(settings, file);
        return c.json({ file: cfbedFile });
      } catch (error) {
        return errorResponse(error.message);
      }
    }

    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const key = `${session.userId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
    await c.env.FILES.put(key, file.stream(), {
      httpMetadata: {
        contentType: normalizeContentType(file.type) || 'application/octet-stream',
        cacheControl: FILE_BROWSER_CACHE_CONTROL
      },
      customMetadata: {
        filename: sanitizeFilename(file.name)
      }
    });

    return c.json({
      file: {
        key,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url: `/files/${encodeURIComponent(key)}`
      }
    });
  });

  app.get('/files/:key{.+}', async (c) => {
    const key = decodeURIComponent(c.req.param('key'));
    const object = await c.env.FILES.get(key);
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', headers.get('cache-control') || FILE_BROWSER_CACHE_CONTROL);
    if (object.uploaded) {
      headers.set('last-modified', object.uploaded.toUTCString());
    }

    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'no-referrer');
    headers.set(
      'content-security-policy',
      "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'"
    );

    const contentType = normalizeContentType(headers.get('content-type'));
    const inlineAllowed = isInlineContentType(contentType);
    const dispositionKind =
      inlineAllowed && !contentType.startsWith('text/') ? 'inline' : 'attachment';
    const filename = object.customMetadata?.filename || key.split('/').pop() || 'file';
    headers.set('content-disposition', contentDispositionValue(dispositionKind, filename));

    const ifNoneMatch = c.req.header('if-none-match');
    if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
      return new Response(null, {
        status: 304,
        headers
      });
    }

    return new Response(object.body, { headers });
  });
}
