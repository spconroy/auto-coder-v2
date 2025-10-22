import crypto from 'crypto';

export const newTaskId = (): string => {
  const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  const random = crypto.randomBytes(3).toString('hex');
  return `T-${timestamp}-${random}`;
};

export const makeSlug = (input: string | undefined): string => {
  const base = input && input.trim().length > 0 ? input : 'task';
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'task';
};
