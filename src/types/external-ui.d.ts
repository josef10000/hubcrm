declare module '@heroui/react' {
  import React from 'react';
  
  // Tipo utilitário: base para sub-componentes que aceitam children + className
  type SubFC<P = {}> = React.FC<{ children?: React.ReactNode; className?: string } & P>;

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
    className?: string;
    fullWidth?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: string;
  }
  export const ButtonGroup: React.FC<ButtonGroupProps> & {
    Separator: React.FC<{ className?: string }>;
  };

  export const Description: React.FC<{ children?: React.ReactNode; className?: string }>;
  export const Header: React.FC<{ children?: React.ReactNode; className?: string }>;
  export const Label: React.FC<{ children?: React.ReactNode; className?: string; htmlFor?: string }>;
  export const Separator: React.FC<{ className?: string; orientation?: string }>;
  
  export interface KbdProps {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    slot?: string;
  }
  export const Kbd: React.FC<KbdProps> & {
    Abbr: React.FC<{ keyValue: string }>;
    Content: SubFC;
  };

  export interface DropdownProps {
    children?: React.ReactNode;
  }
  export const Dropdown: React.FC<DropdownProps> & {
    Popover: SubFC;
    Menu: SubFC<{ onAction?: (key: any) => void }>;
    Section: SubFC;
    Item: SubFC<{ id: string; textValue?: string; variant?: string }>;
  };

  export interface CalendarProps {
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
    focusedValue?: any;
    value?: any;
    onChange?: (value: any) => void;
    onFocusChange?: (value: any) => void;
  }
  export const Calendar: React.FC<CalendarProps> & {
    Header: SubFC;
    Heading: React.FC<{ className?: string }>;
    NavButton: React.FC<{ slot: 'previous' | 'next'; className?: string }>;
    Grid: SubFC;
    GridHeader: SubFC<{ children?: (day: string) => React.ReactNode }>;
    HeaderCell: SubFC;
    GridBody: SubFC<{ children?: (date: any) => React.ReactNode }>;
    Cell: React.FC<{ date: any; className?: string }>;
  };

  export interface CheckboxProps {
    children?: React.ReactNode;
    className?: string;
    id?: string;
    key?: any;
    checked?: boolean;
    isSelected?: boolean;
    defaultSelected?: boolean;
    onChange?: (e: any) => void;
    onValueChange?: (isSelected: boolean) => void;
    variant?: string;
    slot?: string;
    'aria-label'?: string;
  }
  export const Checkbox: React.FC<CheckboxProps> & {
    Control: SubFC;
    Indicator: React.FC<{ className?: string }>;
    Content: SubFC;
  };

  export interface MeterProps {
    children?: React.ReactNode;
    color?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
    value?: number;
    className?: string;
  }
  export const Meter: React.FC<MeterProps> & {
    Output: React.FC<{ className?: string }>;
    Track: SubFC;
    Fill: React.FC<{ className?: string }>;
    ValueLabel: React.FC<{ className?: string }>;
  };

  export interface PaginationProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const Pagination: React.FC<PaginationProps> & {
    Content: SubFC;
    Item: SubFC<{ key?: any }>;
    Previous: SubFC<{ isDisabled?: boolean; onPress?: () => void }>;
    PreviousIcon: React.FC<{ className?: string }>;
    Ellipsis: React.FC<{ className?: string }>;
    Link: SubFC<{ isActive?: boolean; onPress?: () => void }>;
    Next: SubFC<{ isDisabled?: boolean; onPress?: () => void }>;
    NextIcon: React.FC<{ className?: string }>;
  };

  export interface SelectProps {
    children?: React.ReactNode;
    className?: string;
    placeholder?: string;
    value?: string;
    onChange?: (value: any) => void;
    onSelectionChange?: (key: any) => void;
  }
  export const Select: React.FC<SelectProps> & {
    Trigger: SubFC;
    Value: React.FC<{ className?: string; placeholder?: string }>;
    Indicator: React.FC<{ className?: string }>;
    Popover: SubFC;
  };

  export interface ListBoxProps {
    children?: React.ReactNode;
    className?: string;
    onAction?: (key: any) => void;
  }
  export const ListBox: React.FC<ListBoxProps> & {
    Item: SubFC<{ id: string; textValue?: string }>;
    ItemIndicator: React.FC<{ className?: string }>;
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
    Control: SubFC;
    Thumb: SubFC;
    Icon: SubFC;
  };

  export interface AvatarProps {
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  export const Avatar: React.FC<AvatarProps> & {
    Image: React.FC<{ src?: string; className?: string }>;
    Fallback: SubFC;
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
    className?: string;
  }
  export const Table: React.FC<TableProps> & {
    ScrollContainer: SubFC;
    Content: SubFC<{
      'aria-label'?: string;
      selectedKeys?: Selection;
      selectionMode?: 'none' | 'single' | 'multiple';
      sortDescriptor?: SortDescriptor;
      onSelectionChange?: (keys: any) => void;
      onSortChange?: (descriptor: SortDescriptor) => void;
    }>;
    Header: SubFC;
    Column: SubFC<{ isRowHeader?: boolean; pr?: number; allowsSorting?: boolean; id?: string; children?: React.ReactNode | ((props: { sortDirection?: 'ascending' | 'descending' }) => React.ReactNode) }>;
    Body: SubFC;
    Row: SubFC<{ id?: any }>;
    Cell: SubFC;
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
    value?: any;
    onChange?: (value: any) => void;
  }
  export const TimeField: React.FC<TimeFieldProps> & {
    Group: SubFC;
    Input: React.FC<{ children?: (segment: any) => React.ReactNode; className?: string }>;
    Segment: React.FC<{ segment: any; className?: string }>;
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
    className?: string;
    isAttached?: boolean;
    'aria-label'?: string;
  }
  export const Toolbar: React.FC<ToolbarProps>;

  export interface ToggleButtonGroupProps {
    children?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
    selectionMode?: 'single' | 'multiple';
  }
  export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> & {
    Separator: React.FC<{ className?: string }>;
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
