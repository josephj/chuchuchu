type StylesType = {
  control: Record<string, unknown>;
  container: Record<string, unknown>;
  option: Record<string, unknown>;
};

export const styles = {
  control: (base: StylesType['control']) => ({
    ...base,
    minHeight: '32px',
    width: '200px',
  }),
  container: (base: StylesType['container']) => ({
    ...base,
    zIndex: 2,
  }),
  option: (base: StylesType['option']) => ({
    ...base,
    cursor: 'pointer',
    padding: '8px 12px',
  }),
};
