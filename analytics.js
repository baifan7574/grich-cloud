(function () {
  "use strict";

  const MEASUREMENT_ID = "G-BY22TVGOJ6";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  const tagScript = document.createElement("script");
  tagScript.async = true;
  tagScript.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(tagScript);

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);

  window.jflTrack = function (eventName, parameters) {
    window.gtag("event", eventName, parameters || {});
  };

  document.addEventListener("click", function (event) {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;

    let destination;
    try {
      destination = new URL(link.href, window.location.origin);
    } catch {
      return;
    }

    if (destination.origin === window.location.origin && destination.pathname === "/intake") {
      window.jflTrack("begin_intake", {
        link_location: window.location.pathname,
        product_tier: destination.searchParams.get("tier") || "not_selected"
      });
      return;
    }

    if (destination.origin === window.location.origin && destination.pathname === "/pricing") {
      window.jflTrack("view_pricing", { link_location: window.location.pathname });
      return;
    }

    if (destination.hostname === "payhip.com" || destination.hostname.endsWith(".payhip.com")) {
      window.jflTrack("begin_checkout", { link_location: window.location.pathname });
    }
  });
}());
