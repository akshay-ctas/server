interface Category {
  _id: string;
  name: string;
}

interface CategoryTreeNode {
  _id: string;
  name: string;
  children: CategoryTreeNode[];
}

interface CategoryTreeNodeInternal {
  _id: string;
  name: string;
  children: Record<string, CategoryTreeNodeInternal>;
}

const buildCategoryTree = (categoryPaths: Category[][]): CategoryTreeNode[] => {
  const root: Record<string, CategoryTreeNodeInternal> = {};

  for (const path of categoryPaths) {
    if (!path || !Array.isArray(path)) continue; // ✅ null path guard

    let currentLevel = root;

    for (const category of path) {
      // ✅ category ya _id undefined ho toh skip karo
      if (!category || !category._id || !category.name) continue;

      const id = category._id.toString();

      if (!currentLevel[id]) {
        currentLevel[id] = {
          _id: category._id,
          name: category.name,
          children: {},
        };
      }

      currentLevel = currentLevel[id].children;
    }
  }

  const toArray = (
    node: Record<string, CategoryTreeNodeInternal>
  ): CategoryTreeNode[] => {
    return Object.values(node).map((item) => ({
      _id: item._id,
      name: item.name,
      children: toArray(item.children),
    }));
  };

  return toArray(root);
};

export default buildCategoryTree;
