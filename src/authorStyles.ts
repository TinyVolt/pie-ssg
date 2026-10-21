// Loads every `.css` file in `/styles`. Kept in its own module because Vite hoists
// glob imports to the top of a file; `app.tsx` imports this after `app.css`.
import.meta.glob('/styles/**/*.css', { eager: true });
