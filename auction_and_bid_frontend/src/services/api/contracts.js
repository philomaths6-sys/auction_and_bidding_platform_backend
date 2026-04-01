// Human-readable contract map (source of truth = backend routers/schemas).
// This is used for debugging and for keeping service functions aligned.

export const API_CONTRACTS = {
  health: { method: 'GET', path: '/health' },

  auth: {
    register: { method: 'POST', path: '/auth/register' },
    login: { method: 'POST', path: '/auth/login', contentType: 'application/x-www-form-urlencoded' },
  },

  users: {
    me: { method: 'GET', path: '/users/me' },
    updateProfile: { method: 'PUT', path: '/users/me/profile' },
    publicProfile: { method: 'GET', path: '/users/{user_id}' },
  },

  categories: {
    list: { method: 'GET', path: '/categories/' },
    get: { method: 'GET', path: '/categories/{category_id}' },
    create: { method: 'POST', path: '/categories/', role: 'admin' },
    delete: { method: 'DELETE', path: '/categories/{category_id}', role: 'admin' },
  },

  auctions: {
    list: { method: 'GET', path: '/auctions/' },
    search: { method: 'GET', path: '/auctions/search' },
    get: { method: 'GET', path: '/auctions/{auction_id}' },
    my: { method: 'GET', path: '/auctions/my' },
    create: { method: 'POST', path: '/auctions/' },
    update: { method: 'PATCH', path: '/auctions/{auction_id}' },
    delete: { method: 'DELETE', path: '/auctions/{auction_id}' },
    report: { method: 'POST', path: '/auctions/{auction_id}/report', query: ['reason'] },
    changeStatus: { method: 'PATCH', path: '/auctions/{auction_id}/status' },
    winner: { method: 'GET', path: '/auctions/{auction_id}/winner' },
    images: {
      add: { method: 'POST', path: '/auctions/{auction_id}/images' },
      delete: { method: 'DELETE', path: '/auctions/{auction_id}/images/{image_id}' },
    },
    attributes: {
      add: { method: 'POST', path: '/auctions/{auction_id}/attributes' },
      delete: { method: 'DELETE', path: '/auctions/{auction_id}/attributes/{attribute_id}' },
    },
  },

  bids: {
    place: { method: 'POST', path: '/auctions/{auction_id}/bid' },
    list: { method: 'GET', path: '/auctions/{auction_id}/bids' },
    history: { method: 'GET', path: '/auctions/{auction_id}/bid-history' },
    my: { method: 'GET', path: '/auctions/my-bids' },
    ws: { method: 'WS', path: '/auctions/ws/{auction_id}' },
  },

  comments: {
    list: { method: 'GET', path: '/auctions/{auction_id}/comments' },
    post: { method: 'POST', path: '/auctions/{auction_id}/comments' },
    delete: { method: 'DELETE', path: '/auctions/{auction_id}/comments/{comment_id}' },
  },

  watchlist: {
    list: { method: 'GET', path: '/watchlist/' },
    add: { method: 'POST', path: '/watchlist/{auction_id}' },
    remove: { method: 'DELETE', path: '/watchlist/{auction_id}' },
  },

  notifications: {
    list: { method: 'GET', path: '/notifications/' },
    unreadCount: { method: 'GET', path: '/notifications/unread-count' },
    markRead: { method: 'PUT', path: '/notifications/{notif_id}/read' },
    markAllRead: { method: 'PUT', path: '/notifications/read-all' },
  },

  payments: {
    create: { method: 'POST', path: '/payments/' },
    my: { method: 'GET', path: '/payments/' },
    get: { method: 'GET', path: '/payments/{payment_id}' },
  },

  ratings: {
    create: { method: 'POST', path: '/ratings/' },
    seller: { method: 'GET', path: '/ratings/seller/{seller_id}' },
  },

  admin: {
    users: { method: 'GET', path: '/admin/users' },
    reports: { method: 'GET', path: '/admin/reports' },
    updateReport: { method: 'PATCH', path: '/admin/reports/{report_id}', query: ['status'] },
    fraudFlags: { method: 'GET', path: '/admin/fraud-flags' },
    logs: { method: 'GET', path: '/admin/logs' },
    banUser: { method: 'DELETE', path: '/admin/users/{identifier}' },
    promoteAdmin: { method: 'POST', path: '/admin/promote-admin' },
  },
};

