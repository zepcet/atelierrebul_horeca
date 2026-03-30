import { Megaphone, Globe, Users, Crown, Mail, ScrollText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "All Leads", url: "/", icon: Users },
  { title: "Ads Leads", url: "/ads-leads", icon: Megaphone },
  { title: "Website Leads", url: "/website-leads", icon: Globe },
  { title: "Lead Hub P1 & P2", url: "/lead-hub-high", icon: Crown },
  { title: "Lead Hub P3 & P4", url: "/lead-hub-low", icon: Mail },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="px-3 pb-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" />
              Latest Updates
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60 mt-1" />
                Company, Name &amp; Title are now editable
              </li>
              <li className="flex gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60 mt-1" />
                Added &ldquo;Custom&rdquo; to status dropdown
              </li>
              <li className="flex gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60 mt-1" />
                Added &ldquo;Delete&rdquo; option to entries — dashboard only, not the database
              </li>
            </ul>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
