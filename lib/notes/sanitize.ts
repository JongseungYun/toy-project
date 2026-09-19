// 공유 링크로 보여줄 일반 문서의 본문 손질.
//
// 일반 문서는 편집기가 만든 HTML을 그대로 보관한다. 내 화면에서는 내가 쓴 것을
// 내가 보는 것이라 문제가 없지만, 공유 링크는 남의 브라우저에서 열린다.
// 글의 모양을 내는 것만 남기고, 코드를 돌릴 수 있는 것은 걷어 낸다.
//
// 이것은 서식을 지우는 손질이 아니다. style, class, 글꼴, 색은 그대로 둔다.

/** 안에 든 것까지 통째로 지울 것. 글의 모양과 상관이 없다. */
const BLOCK_TAGS = ["script", "style", "iframe", "object", "embed", "form", "svg"];

/** 짝이 없는 것. 여는 것 하나로 끝나므로 그 자리만 지운다. */
const VOID_TAGS = ["link", "meta", "base", "applet"];

const EVENT_ATTRIBUTE = /\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL =
  /\s+(?:href|src|xlink:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*'|(?:javascript|data|vbscript):[^\s>]+)/gi;

/**
 * 남의 브라우저에서 돌 수 있는 것을 걷어 낸 본문.
 *
 * 편집기가 만드는 HTML은 문단, 목록, span과 인라인 style로 이루어진다.
 * 그 밖의 것이 들어오는 길은 붙여넣기뿐이라, 위험한 것을 골라 지우는 것으로
 * 충분하다. 태그를 하나하나 허락하는 방식은 붙여넣기로 들어온 멀쩡한 서식까지
 * 함께 지운다.
 */
export function sanitizeHtml(html: string): string {
  let safe = html;

  for (const tag of BLOCK_TAGS) {
    safe = safe.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    // 닫는 짝을 잃은 여는 태그도 남기지 않는다.
    safe = safe.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }

  for (const tag of VOID_TAGS) {
    safe = safe.replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  safe = safe.replace(EVENT_ATTRIBUTE, "");
  safe = safe.replace(DANGEROUS_URL, "");

  return safe;
}
