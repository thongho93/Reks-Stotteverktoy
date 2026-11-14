/**
 * Callback-ref som gir et element nøyaktig den høyden som er igjen ned til bunnen av siden,
 * slik at siden ikke får rulling og bare innholdet i elementet ruller.
 *
 * Elementets plass beregnes ut fra rullebeholderen rundt (Layout) og bunnmargen i beholderne mellom.
 * Høyden regnes ut på nytt når vinduet endrer størrelse.
 */
export function fitToPageBottom(reserve = 8, minHeight = 320) {
  return (node: HTMLElement | null) => {
    if (!node) return;

    const apply = () => {
      let scroller: HTMLElement | null = node.parentElement;
      let belowSpace = 0;
      while (scroller) {
        const style = getComputedStyle(scroller);
        if (style.overflowY === "auto" || style.overflowY === "scroll") break;
        belowSpace += (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.marginBottom) || 0);
        scroller = scroller.parentElement;
      }
      const scrollTop = scroller?.scrollTop ?? 0;
      const viewportBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
      const top = node.getBoundingClientRect().top + scrollTop;
      node.style.height = `${Math.max(minHeight, Math.floor(viewportBottom - top - belowSpace - reserve))}px`;
    };

    apply();
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  };
}
