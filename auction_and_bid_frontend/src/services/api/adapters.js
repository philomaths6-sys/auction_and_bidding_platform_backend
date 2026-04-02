// Centralized response adapters so UI never relies on non-existent backend fields.
// Keep these small and pure: input JSON -> UI-friendly shape.

const toNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const pickPrimaryImageUrl = (auction) => {
  const imgs = auction?.images || [];
  const primary = imgs.find((i) => i?.is_primary);
  return (
    primary?.image_url ||
    imgs[0]?.image_url ||
    'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=1200'
  );
};

export const normalizeAuction = (auction, categoryById) => {
  if (!auction) return auction;
  const category = categoryById?.get?.(auction.category_id) || null;

  return {
    ...auction,
    seller_username: auction.seller_username ?? null,
    // Backend does not provide created_at in AuctionResponse; use start_time for “newest”.
    created_at: auction.created_at || auction.start_time || null,
    current_price: toNumber(auction.current_price) ?? 0,
    starting_price: toNumber(auction.starting_price) ?? 0,
    reserve_price: toNumber(auction.reserve_price),
    total_bids: toNumber(auction.total_bids) ?? 0,
    total_views: toNumber(auction.total_views) ?? 0,
    category_name: category?.name || null,
    primary_image_url: pickPrimaryImageUrl(auction),
  };
};

export const normalizeUser = (user) => {
  if (!user) return user;
  const fullName = user?.profile?.full_name || null;
  return {
    ...user,
    display_name: fullName || user.username,
    profile_image: user?.profile?.profile_image || null,
  };
};

export const normalizeBid = (bid) => {
  if (!bid) return bid;
  return {
    ...bid,
    bid_amount: toNumber(bid.bid_amount) ?? 0,
    bidder_id: toNumber(bid.bidder_id),
  };
};

export const normalizePayment = (p) => {
  if (!p) return p;
  return {
    ...p,
    amount: toNumber(p.amount) ?? 0,
  };
};

