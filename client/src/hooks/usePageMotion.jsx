import { useEffect, useRef } from "react";

const targets = [
  ".hero-copy > *", ".hero-visual", ".quick-strip > a",
  ".section-heading", ".page-title", ".how-intro", ".how-step",
  ".bottom-cta", ".clinic-card", ".service-card", ".treatment",
  ".two-column > .panel", ".account-panel > .panel", ".page > .panel",
  ".stats-grid > .stat", ".registration-list > .panel", ".appointment-list > .panel",
  ".about-grid",
].join(",");

// Progressive enhancement: content stays visible and usable without observers
// or animation support. Asynchronous API results are included when they arrive.
export function usePageMotion(pathname) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !root.animate || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};

    function update() {
      dispose();
      if (preference.matches) return;
      const seen = new WeakSet();
      const active = new Set();
      const observer = new IntersectionObserver((entries) => {
        let stagger = 0;
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          observer.unobserve(target);
          if (target.contains(document.activeElement)) continue;
          const animation = target.animate(
            [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }],
            {
              id: "dentabook-reveal",
              duration: 460,
              delay: Math.min(stagger++ * 55, 165),
              easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
              fill: "backwards",
            },
          );
          active.add(animation);
          animation.onfinish = () => active.delete(animation);
          animation.oncancel = () => active.delete(animation);
        }
      }, { threshold: 0.08, rootMargin: "0px 0px -16px 0px" });

      function scan(node) {
        if (!(node instanceof Element)) return;
        const elements = [...node.querySelectorAll(targets)];
        if (node.matches(targets)) elements.unshift(node);
        for (const element of elements) {
          if (seen.has(element)) continue;
          const parent = element.parentElement?.closest(targets);
          if (parent && root.contains(parent)) continue;
          seen.add(element);
          observer.observe(element);
        }
      }
      scan(root);
      const changes = new MutationObserver((records) => {
        for (const record of records) record.addedNodes.forEach(scan);
      });
      changes.observe(root, { childList: true, subtree: true });
      const showFocusedContent = (event) => {
        for (const animation of active) {
          if (animation.effect.target.contains(event.target)) animation.cancel();
        }
      };
      root.addEventListener("focusin", showFocusedContent);
      dispose = () => {
        observer.disconnect();
        changes.disconnect();
        active.forEach(animation => animation.cancel());
        root.removeEventListener("focusin", showFocusedContent);
      };
    }

    update();
    preference.addEventListener("change", update);
    return () => {
      preference.removeEventListener("change", update);
      dispose();
    };
  }, [pathname]);
  return ref;
}
