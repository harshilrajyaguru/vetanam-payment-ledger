// Pagination helpers — implemented in a later phase.

export function parsePagination(_query) {
  return { page: 1, limit: 20 };
}

export function buildPaginatedResponse(_data, _page, _limit, _total) {
  return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
}
