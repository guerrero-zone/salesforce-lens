export interface SidebarDevHubInfo {
  username: string;
  orgId: string;
  instanceUrl: string;
  aliases: string[];
  isDevHub: boolean;
  connectedStatus: string;
  orgType: string;
  edition?: string;
}

export const formatDisplayName = (devHub: SidebarDevHubInfo): string => {
  if (devHub.aliases.length > 0) {
    return devHub.aliases[0];
  }
  return devHub.username.split("@")[0];
};

export const getEditionBadge = (
  edition: string | undefined
): {
  text: string;
  class: string;
} => {
  if (!edition) {
    return { text: "", class: "" };
  }

  const editionLower = edition.toLowerCase();

  // Map editions to badge styles
  if (editionLower.includes("developer")) {
    return { text: edition, class: "badge-developer" };
  }
  if (editionLower.includes("enterprise")) {
    return { text: edition, class: "badge-enterprise" };
  }
  if (editionLower.includes("unlimited")) {
    return { text: edition, class: "badge-unlimited" };
  }
  if (editionLower.includes("professional")) {
    return { text: edition, class: "badge-professional" };
  }
  if (editionLower.includes("partner")) {
    return { text: edition, class: "badge-partner" };
  }
  if (editionLower.includes("performance")) {
    return { text: edition, class: "badge-performance" };
  }
  if (editionLower.includes("group") || editionLower.includes("team")) {
    return { text: edition, class: "badge-group" };
  }

  // Default badge for other editions
  return { text: edition, class: "badge-default" };
};
