import { useEffect, useRef } from 'react';

interface ResizeTextProps {
  text: string;
}

const MIN_FONT_PX = 10;
const MAX_FONT_PX = 96;

function fitTextToBox(content: HTMLElement, bounds: HTMLElement): void {
  let lo = MIN_FONT_PX;
  let hi = MAX_FONT_PX;
  let best = MIN_FONT_PX;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    content.style.fontSize = `${mid}px`;

    const overflows =
      content.scrollWidth > bounds.clientWidth ||
      content.scrollHeight > bounds.clientHeight;

    if (overflows) {
      hi = mid - 1;
    } else {
      best = mid;
      lo = mid + 1;
    }
  }

  content.style.fontSize = `${best}px`;
}

export default function ResizeText({ text }: ResizeTextProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = innerRef.current;
    const content = contentRef.current;
    if (!inner || !content) return;

    const fit = () => fitTextToBox(content, inner);

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(inner);

    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="resize-text">
      <div ref={innerRef} className="resize-text__inner">
        <div ref={contentRef} className="resize-text__content">
          {text}
        </div>
      </div>
    </div>
  );
}
