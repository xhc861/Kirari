export const friends: {
	name: string;
	desc: string;
	avatar: string;
	url: string;
	pin?: boolean;
	/**
	 * 人工确认已失效。
	 *
	 * 自动巡检（scripts/check-friends.mjs）只把 404/410 判为失效，超时和网络
	 * 错误一律从宽 —— 那可能只是探测端的网络问题。真的关站了就在这里手动标，
	 * 人的判断优先于脚本。
	 */
	dead?: boolean;
}[] = [
	{
		name: "SiiWay Team Home",
		desc: "SiiWay 团队官方主页",
		avatar: "https://icons.siiway.org/siiway/icon.svg",
		url: "https://siiway.org",
		pin: true,
	},
	{
		name: "wyf9",
		desc: "什么都有的个人 blog?",
		avatar: "https://wyf9.top/favicon.png",
		url: "https://wyf9.top",
	},
	{
		name: "Shattered217のBlog",
		desc: "一个有趣的白日梦想家",
		avatar:
			"https://nvcc-v.com/wp-content/uploads/2025/12/1766747848-250x250nobk.png",
		url: "https://nvcc-v.com/",
	},
	{
		name: "小源151 的博客",
		desc: "欢迎来到小源151官方博客！",
		avatar:
			"https://www.gravatar.com/avatar/418e1da2b29ef51b1f86d6b2e041981d703c748aa0bd29831bac02fa9747faa7",
		url: "https://blog.xiaoyuan151.com",
	},
	{
		name: "MIFENG BLOG",
		desc: "一个菜鸟的博客",
		avatar: "https://cdn.mfawa.top/image/logo.svg",
		url: "https://blog.imbee.top/",
	},
	{
		name: "fishcpy的小破站",
		desc: "非淡泊无以明志，非宁静无以致远",
		avatar: "https://www.fis.ink/img/logo.png",
		url: "https://blog.fis.ink",
	},
	{
		name: "AcoFork Blog",
		desc: "Protect What You Love.",
		avatar: "https://q2.qlogo.cn/headimg_dl?dst_uin=2726730791&spec=0",
		url: "https://blog.2b2x.cn",
		dead: true,
	},
	{
		name: "Ad_closeNN 的小站",
		desc: "永远相信美好的事情即将发生",
		avatar: "https://adclosenn.top/assets/avatar.jpg",
		url: "https://adclosenn.top",
		dead: true,
	},
	{
		name: "mxd's Blog",
		desc: "Empowered by technology, inspired by life.",
		avatar: "https://res.mxdyeah.com/favicon.webp",
		url: "https://blog.mxdyeah.com/",
	},
	{
		name: "LiyaoUniversity",
		desc: "一座普通，或者不普通的大学",
		avatar: "https://q2.qlogo.cn/headimg_dl?dst_uin=3168940165&spec=0",
		url: "https://liyao.edu.kg/",
		dead: true,
	},
	{
		name: "洛初 的 档案馆",
		desc: "记录折腾过的各种东西",
		avatar:
			"https://weavatar.com/avatar/4857f63b6e75c96621f24af9b451144731f670b55996cc8f28ac130e1a32332d?s=160&d=mm&r=g",
		url: "https://blog.luochu.cc/",
	},
	{
		name: "Nicrozoft",
		desc: "Nicrozoft 官方网站",
		avatar: "https://nicrozoft.github.io/img/NZ.ico",
		url: "https://nicrozoft.github.io/",
	},
	{
		name: "Murasame",
		desc: "我已经下了决心，要与深爱的少女一起在这片土地生活下去。我对此无比自豪。",
		avatar:
			"https://blog.shirayukinoa.top/_astro/Murasame.0zIy958b_ZajvDy.webp",
		url: "https://blog.shirayukinoa.top/",
	},
];

// 外站链接
export const externalSites: {
	name: string;
	desc: string;
	avatar: string;
	url: string;
	category?: string;
}[] = [
	{
		name: "GitHub",
		desc: "全球最大的代码托管平台",
		avatar: "https://github.githubassets.com/favicons/favicon.svg",
		url: "https://github.com",
		category: "开发工具",
	},
	{
		name: "Stack Overflow",
		desc: "程序员问答社区",
		avatar: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico",
		url: "https://stackoverflow.com",
		category: "开发工具",
	},
	// 可以在这里添加更多外站链接
];
