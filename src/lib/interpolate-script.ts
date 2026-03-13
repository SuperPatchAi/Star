/**
 * Replaces contact-name placeholders in script text with the actual first name.
 *
 * Handles:
 *  - {{FirstName}}       (standard template variable)
 *  - [Name]              (existing roadmap bracket style)
 *  - [Prospect Name]     (existing roadmap bracket style)
 *
 * When firstName is empty/undefined the placeholders are left as-is so
 * scripts still read naturally for a generic preview.
 */
export function interpolateScript(
  text: string,
  firstName: string | undefined | null,
): string {
  if (!firstName) return text;

  return text
    .replace(/\{\{FirstName\}\}/g, firstName)
    .replace(/\[Name\]/gi, firstName)
    .replace(/\[Prospect Name\]/gi, firstName);
}
