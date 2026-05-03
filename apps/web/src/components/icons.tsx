import {
  Accessibility,
  BookOpen,
  ChartLine,
  Compass,
  Computer,
  Feather,
  FileText,
  Keyboard,
  MessageSquare,
  Newspaper,
  Radio,
  Rocket,
  Rows3,
  ShieldAlert,
  ShieldCheck,
  SquareTerminal,
  Wrench,
  XCircle
} from "lucide-react";
import type { IconToken } from "@openclog/core";

export function iconFor(token: IconToken) {
  const icons = {
    accessibility: Accessibility,
    approval: XCircle,
    book: BookOpen,
    chart: ChartLine,
    compass: Compass,
    desktop: Computer,
    feed: Rows3,
    file: FileText,
    keyboard: Keyboard,
    message: MessageSquare,
    newspaper: Newspaper,
    quill: Feather,
    radio: Radio,
    shield: ShieldCheck,
    starship: Rocket,
    terminal: SquareTerminal,
    tool: Wrench
  };
  return icons[token] ?? ShieldAlert;
}
