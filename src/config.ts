import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "xhc861's Blog",
	subtitle: "博客，远不止于博客",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/26c.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: true, // Display the credit text of the banner image
			text: "Pixiv", // Credit text displayed on the banner
			url: "https://www.pixiv.net/artworks/138988325", // (Optional) URL link to the original artwork or artist's page
		},
	},
	announcement: {
		enable: true, // Enable the announcement banner
		title: "公告", // Title of the announcement (optional)
		content: "建议使用宽屏设备访问本站，或打开手机横屏模式！", // Content of the announcement
		icon: "fa6-solid:bullhorn", // Icon for the announcement (optional)
		closeable: true, // Allow users to close the announcement
		critical: false, // Set to true for critical announcements (displays in red)
		// link: {
		// 	text: "查看详情",
		// 	url: "/posts/20260103001/",
		// }, // Optional link in the announcement
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		{
			src: "/favicon/fav00.ico", // Path of the favicon, relative to the /public directory            // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
			sizes: "32x32", // (Optional) Size of the favicon, set only if you have favicons of different sizes
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Works,
		LinkPreset.Other,
		LinkPreset.About,
		LinkPreset.friend,
		{
			name: "GitHub",
			url: "https://github.com/xhc861/Kirari", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "xhc861",
	bio: "博客，远不止于博客~",
	links: [
		{
			name: "微信",
			icon: "fa6-brands:weixin",
			url: "/webpage/wechat.html",
		},
		{
			name: "Twitter(X)",
			icon: "fa6-brands:square-x-twitter",
			url: "https://x.com/SiiWay_xhc861",
		},
		{
			name: "Twitch",
			icon: "fa6-brands:twitch",
			url: "https://www.twitch.tv/xhc861",
		},
		{
			name: "Mail",
			icon: "fa6-solid:envelope",
			url: "/webpage/mail.html",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/xhc861",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
