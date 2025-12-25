import { useState, useCallback } from 'react';

interface UseTagsOptions {
  initialTags?: string[];
  maxTags?: number;
  transformTag?: (tag: string) => string;
}

interface UseTagsReturn {
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  handleTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearTags: () => void;
  setTags: (tags: string[]) => void;
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const {
    initialTags = [],
    maxTags = 20,
    transformTag = (tag) => tag.trim().toLowerCase(),
  } = options;

  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');

  const addTag = useCallback((): void => {
    const trimmedTag = transformTag(tagInput);
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      setTags((prev) => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags, maxTags, transformTag]);

  const removeTag = useCallback((tagToRemove: string): void => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  const clearTags = useCallback((): void => {
    setTags([]);
    setTagInput('');
  }, []);

  return {
    tags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    handleTagKeyDown,
    clearTags,
    setTags,
  };
}
