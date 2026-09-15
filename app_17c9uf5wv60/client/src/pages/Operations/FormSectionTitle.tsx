interface FormSectionTitleProps {
  title: string;
}

export function FormSectionTitle({ title }: FormSectionTitleProps) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-4 w-1 rounded-sm bg-primary" />
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
