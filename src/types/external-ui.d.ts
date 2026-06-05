declare module '@heroui/react' {
  import React from 'react';
  
  export function cn(...inputs: any[]): string;

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isIconOnly?: boolean;
    variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'ghost' | 'shadow' | 'secondary' | 'tertiary' | 'danger' | 'danger-soft';
    size?: 'sm' | 'md' | 'lg';
    onPress?: () => void;
  }
  export const Button: React.FC<ButtonProps>;

  export interface ButtonGroupProps {
    children?: React.ReactNode;
    fullWidth?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: string;
  }
  export const ButtonGroup: React.FC<ButtonGroupProps> & {
    Separator: React.FC;
  };

  export const Description: React.FC<{ children?: React.ReactNode; className?: string }>;
  export const Header: React.FC<{ children?: React.ReactNode; className?: string }>;
  export const Label: React.FC<{ children?: React.ReactNode; className?: string; htmlFor?: string }>;
  export const Separator: React.FC<{ className?: string }>;
  
  export interface KbdProps {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    slot?: string;
  }
  export const Kbd: React.FC<KbdProps> & {
    Abbr: React.FC<{ keyValue: string }>;
    Content: React.FC<{ children?: React.ReactNode }>;
  };

  export interface DropdownProps {
    children?: React.ReactNode;
  }
  export const Dropdown: React.FC<DropdownProps> & {
    Popover: React.FC<{ children?: React.ReactNode }>;
    Menu: React.FC<{ children?: React.ReactNode; onAction?: (key: any) => void }>;
    Section: React.FC<{ children?: React.ReactNode }>;
    Item: React.FC<{ children?: React.ReactNode; id: string; textValue?: string; variant?: string; className?: string }>;
  };

  export interface CalendarProps {
    children?: React.ReactNode;
    'aria-label'?: string;
    focusedValue?: any;
    value?: any;
    onChange?: (value: any) => void;
    onFocusChange?: (value: any) => void;
  }
  export const Calendar: React.FC<CalendarProps> & {
    Header: React.FC<{ children?: React.ReactNode }>;
    Heading: React.FC;
    NavButton: React.FC<{ slot: 'previous' | 'next' }>;
    Grid: React.FC<{ children?: React.ReactNode }>;
    GridHeader: React.FC<{ children?: (day: string) => React.ReactNode }>;
    HeaderCell: React.FC<{ children?: React.ReactNode }>;
    GridBody: React.FC<{ children?: (date: any) => React.ReactNode }>;
    Cell: React.FC<{ date: any }>;
  };

  export interface CheckboxProps {
    children?: React.ReactNode;
    id?: string;
    checked?: boolean;
    onChange?: (e: any) => void;
    variant?: string;
    slot?: string;
    'aria-label'?: string;
  }
  export const Checkbox: React.FC<CheckboxProps> & {
    Control: React.FC<{ children?: React.ReactNode }>;
    Indicator: React.FC;
    Content: React.FC<{ children?: React.ReactNode }>;
  };

  export interface MeterProps {
    children?: React.ReactNode;
    color?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
    value?: number;
    className?: string;
  }
  export const Meter: React.FC<MeterProps> & {
    Output: React.FC;
    Track: React.FC<{ children?: React.ReactNode }>;
    Fill: React.FC;
  };

  export interface PaginationProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const Pagination: React.FC<PaginationProps> & {
    Content: React.FC<{ children?: React.ReactNode }>;
    Item: React.FC<{ children?: React.ReactNode; key?: any }>;
    Previous: React.FC<{ children?: React.ReactNode; isDisabled?: boolean; onPress?: () => void }>;
    PreviousIcon: React.FC;
    Ellipsis: React.FC;
    Link: React.FC<{ children?: React.ReactNode; isActive?: boolean; onPress?: () => void }>;
    Next: React.FC<{ children?: React.ReactNode; isDisabled?: boolean; onPress?: () => void }>;
    NextIcon: React.FC;
  };

  export interface SelectProps {
    children?: React.ReactNode;
    className?: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: any) => void;
  }
  export const Select: React.FC<SelectProps> & {
    Trigger: React.FC<{ children?: React.ReactNode }>;
    Value: React.FC;
    Indicator: React.FC;
    Popover: React.FC<{ children?: React.ReactNode }>;
  };

  export interface ListBoxProps {
    children?: React.ReactNode;
    onAction?: (key: any) => void;
  }
  export const ListBox: React.FC<ListBoxProps> & {
    Item: React.FC<{ children?: React.ReactNode; id: string; textValue?: string }>;
    ItemIndicator: React.FC;
  };

  export interface SwitchRenderProps {
    isSelected: boolean;
  }
  export interface SwitchProps {
    children?: React.ReactNode | ((props: SwitchRenderProps) => React.ReactNode);
    defaultSelected?: boolean;
    isSelected?: boolean;
    onValueChange?: (isSelected: boolean) => void;
    onChange?: (e: any) => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  export const Switch: React.FC<SwitchProps> & {
    Control: React.FC<{ children?: React.ReactNode; className?: string }>;
    Thumb: React.FC<{ children?: React.ReactNode }>;
    Icon: React.FC<{ children?: React.ReactNode }>;
  };

  export interface AvatarProps {
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  export const Avatar: React.FC<AvatarProps> & {
    Image: React.FC<{ src?: string; className?: string }>;
    Fallback: React.FC<{ children?: React.ReactNode; className?: string }>;
  };

  export interface ChipProps {
    children?: React.ReactNode;
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'ghost' | 'shadow' | 'soft';
    className?: string;
  }
  export const Chip: React.FC<ChipProps>;

  export type Selection = 'all' | Set<React.Key>;
  export interface SortDescriptor {
    column?: string;
    direction?: 'ascending' | 'descending';
  }

  export interface TableProps {
    children?: React.ReactNode;
  }
  export const Table: React.FC<TableProps> & {
    ScrollContainer: React.FC<{ children?: React.ReactNode }>;
    Content: React.FC<{
      children?: React.ReactNode;
      'aria-label'?: string;
      className?: string;
      selectedKeys?: Selection;
      selectionMode?: 'none' | 'single' | 'multiple';
      sortDescriptor?: SortDescriptor;
      onSelectionChange?: (keys: any) => void;
      onSortChange?: (descriptor: SortDescriptor) => void;
    }>;
    Header: React.FC<{ children?: React.ReactNode }>;
    Column: React.FC<{ children?: React.ReactNode | ((props: { sortDirection?: 'ascending' | 'descending' }) => React.ReactNode); className?: string; isRowHeader?: boolean; pr?: number; allowsSorting?: boolean; id?: string }>;
    Body: React.FC<{ children?: React.ReactNode }>;
    Row: React.FC<{ children?: React.ReactNode; id?: any }>;
    Cell: React.FC<{ children?: React.ReactNode; className?: string }>;
  };

  export interface TextFieldProps {
    children?: React.ReactNode;
    className?: string;
    name?: string;
    isRequired?: boolean;
  }
  export const TextField: React.FC<TextFieldProps>;

  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    placeholder?: string;
    value?: string;
    onChange?: (e: any) => void;
    className?: string;
  }
  export const Input: React.FC<InputProps>;

  export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    placeholder?: string;
    value?: string;
    onChange?: (e: any) => void;
    rows?: number;
    className?: string;
  }
  export const TextArea: React.FC<TextAreaProps>;

  export interface TimeFieldProps {
    children?: React.ReactNode;
    className?: string;
    name?: string;
  }
  export const TimeField: React.FC<TimeFieldProps> & {
    Group: React.FC<{ children?: React.ReactNode }>;
    Input: React.FC<{ children?: (segment: any) => React.ReactNode }>;
    Segment: React.FC<{ segment: any }>;
  };

  export interface ToastOptions {
    description?: string;
    isLoading?: boolean;
    timeout?: number;
  }
  export interface ToastPromiseOptions<T> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
  export interface ToastModule {
    (message: string, options?: ToastOptions): string;
    success(message: string, options?: ToastOptions): string;
    danger(message: string, options?: ToastOptions): string;
    error(message: string, options?: ToastOptions): string;
    close(id: string): void;
    promise<T>(promise: Promise<T>, options: ToastPromiseOptions<T>): Promise<T>;
  }
  export const toast: ToastModule;

  export interface ToolbarProps {
    children?: React.ReactNode;
    isAttached?: boolean;
    'aria-label'?: string;
  }
  export const Toolbar: React.FC<ToolbarProps>;

  export interface ToggleButtonGroupProps {
    children?: React.ReactNode;
    'aria-label'?: string;
    selectionMode?: 'single' | 'multiple';
  }
  export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> & {
    Separator: React.FC;
  };

  export interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isIconOnly?: boolean;
    variant?: string;
    onPress?: () => void;
  }
  export const ToggleButton: React.FC<ToggleButtonProps>;
}

declare module '@gravity-ui/icons' {
  import React from 'react';
  export const Ellipsis: React.FC<React.SVGProps<SVGSVGElement>>;
  export const EllipsisVertical: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Gear: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Pencil: React.FC<React.SVGProps<SVGSVGElement>>;
  export const SquarePlus: React.FC<React.SVGProps<SVGSVGElement>>;
  export const TrashBin: React.FC<React.SVGProps<SVGSVGElement>>;
  
  export const Bold: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Italic: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Underline: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Scissors: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Copy: React.FC<React.SVGProps<SVGSVGElement>>;

  export const BellFill: React.FC<React.SVGProps<SVGSVGElement>>;
  export const BellSlash: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Check: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Microphone: React.FC<React.SVGProps<SVGSVGElement>>;
  export const MicrophoneSlash: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Moon: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Power: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Sun: React.FC<React.SVGProps<SVGSVGElement>>;
  export const VolumeFill: React.FC<React.SVGProps<SVGSVGElement>>;
  export const VolumeSlashFill: React.FC<React.SVGProps<SVGSVGElement>>;

  export const Bookmark: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Heart: React.FC<React.SVGProps<SVGSVGElement>>;
}

declare module '@iconify/react' {
  import React from 'react';
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    icon: string;
    className?: string;
  }
  export const Icon: React.FC<IconProps>;
}

declare module '@internationalized/date' {
  export interface DateValue {
    toString(): string;
  }
  export function getLocalTimeZone(): string;
  export function parseDate(value: string): DateValue;
  export function startOfMonth(value: DateValue): DateValue;
  export function startOfWeek(value: DateValue, locale: string): DateValue;
  export function today(timeZone: string): DateValue;
}

declare module 'react-aria-components' {
  export function useLocale(): { locale: string };
}
