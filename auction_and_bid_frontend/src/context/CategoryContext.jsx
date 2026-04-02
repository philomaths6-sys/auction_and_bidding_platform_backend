import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { categoryService } from '../services/api/categoryService';

const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

const buildTree = (categories) => {
  const byId = new Map();
  categories.forEach((c) => byId.set(c.id, { ...c, children: [] }));

  const roots = [];
  byId.forEach((c) => {
    if (c.parent_category_id) {
      const parent = byId.get(c.parent_category_id);
      if (parent) parent.children.push(c);
      // If parent_category_id exists but parent is not found, don't add to roots
      // This prevents orphaned categories from appearing as parent categories
    } else {
      roots.push(c);
    }
  });

  // Stable ordering: parent then children by name (backend already sorts by name)
  roots.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  roots.forEach((r) => r.children.sort((a, b) => (a.name || '').localeCompare(b.name || '')));

  return { byId, roots };
};

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await categoryService.getCategories();
        if (mounted) setCategories(data || []);
      } catch (e) {
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tree = useMemo(() => buildTree(categories), [categories]);

  return (
    <CategoryContext.Provider
      value={{
        categories,
        categoryById: tree.byId,
        categoryRoots: tree.roots,
        loading,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

