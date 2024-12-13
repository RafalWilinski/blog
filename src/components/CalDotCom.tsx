"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function CalDotCom() {
	useEffect(() => {
		console.log("CalDotCom");
		(async function () {
			const cal = await getCalApi({ namespace: "30min" });
			cal("floatingButton", {
				calLink: "rafal-wilinski-0fnqql/30min",
				config: { layout: "month_view" },
				buttonText: "Let's have a chat",
			});
			cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
		})();
	}, []);

	return <div id="cal-dot-com"></div>;
}
