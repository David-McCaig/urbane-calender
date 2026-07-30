import {
  CalendarDays,
  LayoutDashboard,
  RefreshCw,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  title: string;
  copy: string;
  image?: string;
  imagePosition?: string;
  icon?: LucideIcon;
};

type Capability = {
  icon: LucideIcon;
  title: string;
  copy: string;
  colors: string;
};

export type Faq = {
  q: string;
  a: string;
};

export const features: Feature[] = [
  {
    image: "/zoe-assets/calendar-product.png",
    imagePosition: "object-[24%_center]",
    title: "See the whole shop at a glance",
    copy: "Give every mechanic a clear daily schedule. See each repair, customer, bicycle, status, and duration without jumping between systems.",
  },
  {
    image: "/zoe-assets/onboarding-product.png",
    imagePosition: "object-[47%_center]",
    title: "Get your team up and running",
    copy: "Create your shop, invite the team, set up your service calendar, and connect Lightspeed through one straightforward onboarding flow.",
  },
  {
    icon: RefreshCw,
    title: "Keep work orders in sync",
    copy: "Bring current Lightspeed Retail work orders and statuses into the calendar so the service desk and workshop stay on the same page.",
  },
  {
    icon: Users,
    title: "Plan work with confidence",
    copy: "Drag repairs onto the right mechanic and time slot, rebalance the day in seconds, and keep every scheduled job visible to the team.",
  },
];

export const capabilities: Capability[] = [
  {
    icon: CalendarDays,
    title: "Visual service\ncalendar",
    copy: "Plan every repair by mechanic, time, and duration in one clear daily workspace.",
    colors: "bg-[#1b214f] text-white",
  },
  {
    icon: Store,
    title: "Lightspeed\nintegration",
    copy: "Import work orders from Lightspeed Retail and keep live service details close at hand.",
    colors: "bg-[#92d7d9] text-[#1b214f]",
  },
  {
    icon: Users,
    title: "Mechanic workload\nmanagement",
    copy: "See who is available, move jobs between mechanics, and balance each day as priorities change.",
    colors: "bg-[#d8c8f2] text-[#1b214f]",
  },
  {
    icon: LayoutDashboard,
    title: "One shared\nworkspace",
    copy: "Give owners and staff a reliable view of scheduled and unscheduled repair work.",
    colors: "bg-[#f8ddca] text-[#1b214f]",
  },
];

export const faqs: Faq[] = [
  {
    q: "What is Urbane Calendar built for?",
    a: "Urbane Calendar is built for bicycle shops that want a faster way to schedule service work. It turns repair work orders into a clear, mechanic-by-mechanic daily plan.",
  },
  {
    q: "Does it connect with Lightspeed Retail?",
    a: "Yes. Connect your Lightspeed Retail account to bring work orders, customer details, bicycle information, and repair statuses into the service calendar.",
  },
  {
    q: "Can I schedule work across multiple mechanics?",
    a: "Yes. Each mechanic has a dedicated calendar column, making it easy to assign, move, and rebalance repairs throughout the day.",
  },
  {
    q: "What happens to unscheduled work orders?",
    a: "They remain visible in the work-order panel until you drag them onto the calendar, so incoming repairs do not disappear from view.",
  },
  {
    q: "Can my whole team use it?",
    a: "Yes. Create a shop workspace, invite staff, and keep everyone working from the same live service schedule.",
  },
];
