'use client';

import React from 'react';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { StatusNoteSuggestion } from '../../utils/statusNoteSuggestions';

interface StatusNoteSuggestionsSelectProps {
  id: string;
  suggestions: StatusNoteSuggestion[];
  value: string;
  onSelect: (text: string) => void;
  label?: string;
}

/**
 * Optional quick-pick dropdown for CODI status notes.
 * Selecting a suggestion fills the notes field; handlers can still edit freely.
 */
export function StatusNoteSuggestionsSelect({
  id,
  suggestions,
  value,
  onSelect,
  label = 'Quick suggestions (optional)',
}: StatusNoteSuggestionsSelectProps) {
  if (suggestions.length === 0) return null;

  const matched = suggestions.find((s) => s.text === value);
  const selectValue = matched?.text ?? '';

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-gray-600">
        {label}
      </Label>
      <Select
        value={selectValue || undefined}
        onValueChange={(text) => onSelect(text)}
      >
        <SelectTrigger id={id} className="h-10 text-sm">
          <SelectValue placeholder="Choose a suggested sentence…" />
        </SelectTrigger>
        <SelectContent>
          {suggestions.map((suggestion) => (
            <SelectItem key={suggestion.text} value={suggestion.text} className="text-sm">
              {suggestion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-gray-500">
        Pick a suggestion above, or type your own note below.
      </p>
    </div>
  );
}
