// Small, stable demo content for chat widgets that don't need a live date
// range (browsing rooms, hotel info). Real pricing/availability for an
// actual booking always comes from the backend's /api/availability, never
// from this file — this only backs the "just show me what you've got"
// widgets where no dates are involved yet.
export const ROOMS = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    description: "A comfortable room for couples and small families.",
    beds: "1 King Bed",
    maxGuests: 2,
    size: "32 m²",
    breakfastIncluded: true,
    price: 8000,
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "executive",
    name: "Executive Room",
    description: "A spacious room with a work area and city view.",
    beds: "1 Queen Bed",
    maxGuests: 2,
    size: "38 m²",
    breakfastIncluded: true,
    price: 10000,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "family",
    name: "Family Suite",
    description: "A larger suite suitable for families and groups.",
    beds: "1 King Bed + Sofa Bed",
    maxGuests: 4,
    size: "52 m²",
    breakfastIncluded: true,
    price: 12500,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80"
  }
];

export const HOTEL_INFO = {
  name: "Sunrise Suites",
  tagline: "Relax. Rejuvenate. Recreate.",
  checkIn: "3:00 PM",
  checkOut: "11:00 AM",
  address: "12 Lakeview Road, Bengaluru",
  phone: "+91 80 4000 1200",
  pool: "Outdoor pool, 6:00 AM – 9:00 PM",
  wifi: "Complimentary high-speed Wi-Fi throughout",
  parking: "Complimentary on-site parking",
  breakfast: "7:00 AM – 10:30 AM (Deluxe, Executive, Suite)"
};
