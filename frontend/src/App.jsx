import { useState } from "react";
import { BedDouble, Coffee, MapPin, ShieldCheck, Waves, X } from "lucide-react";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      <Header onMenu={() => setMenuOpen(true)} />

      {menuOpen && (
        <div className="mobile-drawer">
          <button className="drawer-close" onClick={() => setMenuOpen(false)}><X /></button>
          <a href="#assistant" onClick={() => setMenuOpen(false)}>Assistant</a>
          <a href="#hotel" onClick={() => setMenuOpen(false)}>About the hotel</a>
        </div>
      )}

      <main>
        {/* All booking actions (dates, room selection, payment) happen as
            widgets inside the chat itself — no separate availability page. */}
        <ChatWindow />

        <section className="amenities" id="hotel">
          <div className="amenities-copy">
            <span className="eyebrow">SUNRISE SUITES</span>
            <h2>Everything you need for a comfortable stay.</h2>
            <p>
              A calm, modern hotel experience with thoughtful amenities and a concierge
              that is available whenever you need a quick answer — or to book a room.
            </p>
            <div className="location"><MapPin size={16} /> 12 Lakeview Road, Bengaluru</div>
          </div>

          <div className="amenity-grid">
            <div className="amenity-card"><Waves /><strong>Swimming Pool</strong><span>6 AM – 9 PM</span></div>
            <div className="amenity-card"><Coffee /><strong>Breakfast</strong><span>7 AM – 10:30 AM</span></div>
            <div className="amenity-card"><BedDouble /><strong>Comfortable Rooms</strong><span>Up to 4 guests</span></div>
            <div className="amenity-card"><ShieldCheck /><strong>Flexible Policy</strong><span>24-hour cancellation</span></div>
          </div>
        </section>
      </main>

      <footer>
        <div><strong>Sunrise Suites</strong><span>AI Guest Concierge Demo</span></div>
        <span>Built for full-stack AI assistant evaluation</span>
      </footer>
    </div>
  );
}
