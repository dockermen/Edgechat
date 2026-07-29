export async function getSiteSettings(db) {
	const { results } = await db
		.prepare("SELECT setting_key, setting_value FROM site_settings")
		.all();
	const map = Object.fromEntries(
		results.map((row) => [row.setting_key, row.setting_value]),
	);
	return {
		siteName: String(map.site_name || "Edgechat"),
		siteIconUrl: String(map.site_icon_url || ""),
		attachmentStorage: String(map.attachment_storage || "r2"),
		cfbedBaseUrl: String(map.cfbed_base_url || ""),
		cfbedAuthCode: String(map.cfbed_auth_code || ""),
		cfbedApiToken: String(map.cfbed_api_token || ""),
		cfbedUploadChannel: String(map.cfbed_upload_channel || ""),
		cfbedChannelName: String(map.cfbed_channel_name || ""),
		cfbedUploadFolder: String(map.cfbed_upload_folder || ""),
		dingtalkWebhookUrl: String(map.dingtalk_webhook_url || ""),
		dingtalkPushContent: String(map.dingtalk_push_content || "0") === "1",
	};
}

function upsertSetting(db, key, value) {
	return db
		.prepare(
			`INSERT INTO site_settings (setting_key, setting_value, updated_at)
			 VALUES (?, ?, CURRENT_TIMESTAMP)
			 ON CONFLICT(setting_key) DO UPDATE
			 SET setting_value = excluded.setting_value,
			     updated_at = CURRENT_TIMESTAMP`,
		)
		.bind(key, String(value ?? "").trim());
}

export async function updateSiteSettings(db, settings) {
	const {
		siteName, siteIconUrl, attachmentStorage, cfbedBaseUrl, cfbedAuthCode,
		cfbedApiToken, cfbedUploadChannel, cfbedChannelName, cfbedUploadFolder,
		dingtalkWebhookUrl, dingtalkPushContent,
	} = settings;
	const statements = [];
	if (siteName !== undefined) {
		statements.push(upsertSetting(db, "site_name", String(siteName || "Edgechat").trim() || "Edgechat"));
	}
	if (siteIconUrl !== undefined) {
		statements.push(upsertSetting(db, "site_icon_url", siteIconUrl));
	}
	const optionalSettings = [
		["attachment_storage", attachmentStorage],
		["cfbed_base_url", cfbedBaseUrl],
		["cfbed_auth_code", cfbedAuthCode],
		["cfbed_api_token", cfbedApiToken],
		["cfbed_upload_channel", cfbedUploadChannel],
		["cfbed_channel_name", cfbedChannelName],
		["cfbed_upload_folder", cfbedUploadFolder],
		["dingtalk_webhook_url", dingtalkWebhookUrl],
		["dingtalk_push_content", dingtalkPushContent === undefined ? undefined : (dingtalkPushContent ? "1" : "0")],
	];
	for (const [key, value] of optionalSettings) {
		if (value !== undefined) {
			statements.push(upsertSetting(db, key, value));
		}
	}
	if (statements.length) {
		await db.batch(statements);
	}
	return getSiteSettings(db);
}


export function publicSiteSettings(site) {
	return {
		siteName: site.siteName,
		siteIconUrl: site.siteIconUrl,
	};
}
