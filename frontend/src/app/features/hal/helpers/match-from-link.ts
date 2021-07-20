export default function matchFromLink(href:string, expectedResource:string):string|null {
  const match = new RegExp(`/api/v3/${expectedResource}/(\\d+)`).exec(href);
  return match && match[1];
}
