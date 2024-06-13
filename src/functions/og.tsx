import vercelOGPagesPlugin from "@cloudflare/pages-plugin-vercel-og";
import React from "react";

interface Props {
	ogTitle: string;
}

export const onRequest = vercelOGPagesPlugin<Props>({
	autoInject: {
		openGraph: true,
	},
	component: ({ ogTitle, pathname }) => {
		return <div style={{ color: "red", display: "flex" }}>{ogTitle}</div>;
	},
	extractors: {
		on: {
			'meta[property="og:title"]': (props) => ({
				element(element) {
					props.ogTitle = element.getAttribute("content");
				},
			}),
		},
	},
	imagePathSuffix: "/social-image.png",
});
