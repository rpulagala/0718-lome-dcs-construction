import type { GalleryItem } from "@/components/site/ProjectGallery";

// Seeded placeholder projects for the marketing galleries. Replace with real
// project photos from the client when available (see docs/DECISIONS.md).
export const residentialProjects: GalleryItem[] = [
  { title: "Modern Kitchen Remodel", category: "Kitchen Remodel", description: "Full gut renovation with custom cabinetry, quartz counters, and new island.", hue: 20 },
  { title: "Master Bath Refresh", category: "Bathroom Remodel", description: "Walk-in shower, double vanity, and heated tile flooring.", hue: 200 },
  { title: "Backyard Deck Build", category: "Deck Construction", description: "Composite multi-level deck with integrated bench seating.", hue: 120 },
  { title: "Whole-Home Interior Paint", category: "Interior Painting", description: "Refreshed color palette across a 2,400 sq ft home.", hue: 280 },
  { title: "Finished Basement", category: "Interior Construction", description: "New living space with egress, insulation, and recessed lighting.", hue: 40 },
  { title: "Front Porch Restoration", category: "Exterior Repairs", description: "Rebuilt railings, columns, and weatherproofed decking.", hue: 160 },
];

export const commercialProjects: GalleryItem[] = [
  { title: "Retail Tenant Buildout", category: "Interior Construction", description: "Storefront buildout with new HVAC, electrical, and finishes.", hue: 210 },
  { title: "Office Suite Renovation", category: "Interior Construction", description: "Open-plan conversion with conference rooms and break area.", hue: 260 },
  { title: "Restaurant Remodel", category: "Home Remodel", description: "Front-of-house refresh and code-compliant kitchen upgrades.", hue: 10 },
  { title: "Warehouse Electrical Upgrade", category: "Electrical Upgrades", description: "Panel upgrade and new lighting for a 10,000 sq ft facility.", hue: 50 },
  { title: "Medical Office Fit-Out", category: "Interior Construction", description: "Exam rooms, ADA restrooms, and specialized plumbing.", hue: 180 },
  { title: "Exterior Facade Repaint", category: "Exterior Painting", description: "Full commercial exterior prep and repaint.", hue: 100 },
];
