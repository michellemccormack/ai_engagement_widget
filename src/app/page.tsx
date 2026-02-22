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
          AI Agent Assistant
        </h1>

        <h2 className={styles.subheading}>
          What it does:
        </h2>
        <ul className={styles.list}>
          {[
            'Answers questions 24/7',
            'Captures emails and donations',
            'Matches your voice and brand',
          ].map((item) => (
            <li key={item} className={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>

        <div className={styles.instructionBox}>
          <p className={styles.instructionP}>
            <strong>Try it now:</strong> Click the bubble in the corner. Ask about my work, services, the AI Campaign Assistant—anything.
          </p>
          <p className={styles.instructionP}>
            Notice how it responds naturally, captures contact info when people are ready, and adapts to different questions? That&apos;s all automated. And I can customize every part—messaging, FAQs, branding—for your campaign in days.
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
