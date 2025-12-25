import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

interface PaginationState {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
}

interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  setSearch: (search: string) => void;
  resetPagination: () => void;
  offset: number;
  queryParams: URLSearchParams;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    defaultSortBy = 'createdAt',
    defaultSortOrder = 'desc',
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo((): PaginationState => {
    const page = parseInt(searchParams.get('page') || String(defaultPage), 10);
    const limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
    const sortBy = searchParams.get('sortBy') || defaultSortBy;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultSortOrder;
    const search = searchParams.get('search') || '';

    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      sortBy,
      sortOrder,
      search,
    };
  }, [searchParams, defaultPage, defaultLimit, defaultSortBy, defaultSortOrder]);

  const updateParams = useCallback(
    (updates: Partial<PaginationState>): void => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const setPage = useCallback(
    (page: number): void => {
      updateParams({ page });
    },
    [updateParams],
  );

  const setLimit = useCallback(
    (limit: number): void => {
      updateParams({ limit, page: 1 });
    },
    [updateParams],
  );

  const setSort = useCallback(
    (sortBy: string, sortOrder?: 'asc' | 'desc'): void => {
      updateParams({
        sortBy,
        sortOrder:
          sortOrder || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc'),
        page: 1,
      });
    },
    [updateParams, state.sortBy, state.sortOrder],
  );

  const setSearch = useCallback(
    (search: string): void => {
      updateParams({ search, page: 1 });
    },
    [updateParams],
  );

  const resetPagination = useCallback((): void => {
    router.push(pathname);
  }, [router, pathname]);

  const offset = (state.page - 1) * state.limit;

  const queryParams = useMemo((): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    params.set('sortBy', state.sortBy);
    params.set('sortOrder', state.sortOrder);
    if (state.search) {
      params.set('search', state.search);
    }
    return params;
  }, [state]);

  return {
    ...state,
    setPage,
    setLimit,
    setSort,
    setSearch,
    resetPagination,
    offset,
    queryParams,
  };
}
