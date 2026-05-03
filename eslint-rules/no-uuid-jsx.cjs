module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Bannir UUID en JSX' },
  },
  create(context) {
    const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!UUID.test(node.value)) return;
        const parent = node.parent;
        if (parent.type === 'JSXAttribute') {
          const attrName = parent.name && parent.name.name;
          if (['data-testid', 'key', 'aria-label', 'aria-labelledby', 'href'].includes(attrName)) return;
        }
        context.report({ node, message: 'UUID littéral en JSX interdit (PDF DS v2 règle 10). Utiliser shortCode/name.' });
      },
    };
  },
};
