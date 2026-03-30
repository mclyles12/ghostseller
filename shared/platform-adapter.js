const CONDITION_MAP = {
  new_with_tags: {
    depop: "new",
    vinted: "new_with_tags",
    poshmark: "New With Tags",
    ebay: "New with tags"
  },
  excellent: {
    depop: "like_new",
    vinted: "very_good",
    poshmark: "Excellent",
    ebay: "Pre-owned"
  },
  good: {
    depop: "used_good",
    vinted: "good",
    poshmark: "Good",
    ebay: "Pre-owned"
  },
  fair: {
    depop: "used_fair",
    vinted: "satisfactory",
    poshmark: "Fair",
    ebay: "Pre-owned"
  }
};

export function mapCondition(condition, platform) {
  const normalized = String(condition || "good").toLowerCase().replace(/\s+/g, "_");
  return CONDITION_MAP[normalized]?.[platform] || CONDITION_MAP.good[platform];
}

export function mapCategory(category, platform) {
  if (typeof category === "object" && category !== null) {
    return category[platform] || "";
  }
  return category || "";
}

export function buildHashtags(tags, platform) {
  const normalized = (tags || [])
    .map((tag) => String(tag).trim().replace(/^#/, ""))
    .filter(Boolean);

  if (platform === "depop") {
    return normalized.slice(0, 5);
  }

  return normalized;
}

export function validateListing(listing, platform) {
  const errors = [];
  if (!listing.title?.trim()) errors.push("Title is required.");
  if (!listing.description?.trim()) errors.push("Description is required.");
  if (!listing.price?.[platform]) errors.push(`Price is required for ${platform}.`);
  if (!mapCategory(listing.category, platform)) errors.push(`Category is required for ${platform}.`);
  if (!listing.photos?.length) errors.push("At least one photo is required.");

  return {
    valid: errors.length === 0,
    errors
  };
}

globalThis.PlatformAdapter = {
  mapCondition,
  mapCategory,
  buildHashtags,
  validateListing
};
