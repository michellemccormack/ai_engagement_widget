/**
 * AI Campaign Assistant demo - matches Michelle's layout.
 * Responsive: mobile-first with 640px breakpoint.
 */

import { Tilt_Warp, Bitter } from 'next/font/google';
import styles from './page.module.css';

const tiltWarp = Tilt_Warp({ subsets: ['latin'] });
const bitter = Bitter({ subsets: ['latin'] });

export default function DemoPage() {
  return (
    <main
      className={styles.main}
      style={{ fontFamily: bitter.style.fontFamily }}
    >
      <div className={styles.container}>
        <h1
          className={`${tiltWarp.className} ${styles.heading}`}
        >
          AI Campaign Assistant
        </h1>

        <h2 className={styles.subheading}>
          What it does:
        </h2>
        <ul className={styles.list}>
          {[
            'Answers voter questions 24/7',
            'Captures qualified leads automatically',
            "Matches your campaign's voice and brand",
            'Costs pennies per conversation',
          ].map((item) => (
            <li key={item} className={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>

        <div className={styles.instructionBox}>
          <p className={styles.instructionP}>
            <strong>See it in action in the bottom right</strong> — ask about
            policies, volunteer opportunities, or voter registration. Watch how
            it engages and converts.
          </p>
        </div>
      </div>

      <footer className={styles.footer} style={{ fontFamily: bitter.style.fontFamily }}>
        Built by{' '}
        <a href="https://www.michellemccormack.com/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          Michelle McCormack
        </a>
      </footer>
    </main>
  );
}
