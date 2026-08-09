import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
	[LinkPreset.Home]: {
		name: i18n(I18nKey.home),
		url: "/",
	},
	[LinkPreset.About]: {
		name: i18n(I18nKey.about),
		url: "/about/",
	},
	[LinkPreset.Works]: {
		name: "作品集",
		url: "/works/",
		children: [
			{ name: i18n(I18nKey.archive), url: "/works/posts/" },
			{ name: "谱曲", url: "/works/scores/" },
		],
	},
	[LinkPreset.Other]: {
		name: "展板",
		url: "/dashboard/",
	},
	[LinkPreset.Stats]: {
		name: "统计",
		url: "/stats/",
	},
	[LinkPreset.friend]: {
		name: "友链&外站",
		url: "/friends/",
	},
};
