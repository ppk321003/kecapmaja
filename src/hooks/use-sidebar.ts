
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarItem } from "@/types";

export const useSidebar = () => {
  return useQuery({
    queryKey: ["sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sidebar")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      
      if (error) {
        console.error("Error fetching sidebar items:", error);
        throw error;
      }
      
      return data as SidebarItem[];
    }
  });
};

export default useSidebar;
