export interface QuickInfoContent {
  'Campus Safety Guidelines': {
    items: string[];
  };
  'Emergency Contacts': {
    contacts: Array<{ label: string; number: string; }>;
  };
  'Academic Calendar': {
    events: Array<{ event: string; date: string; }>;
  };
}
