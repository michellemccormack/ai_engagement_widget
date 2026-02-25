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
          Promptly
        </h1>

        <h2 className={styles.subheading}>
          What it does:
        </h2>
        <ul className={styles.list}>
          {[
            'Answers questions 24/7',
            'Captures emails and donations',
            'Matches your voice in conversational language',
          ].map((item) => (
            <li key={item} className={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>

        <div className={styles.instructionBox}>
          <p className={styles.instructionP}>
            <strong>Try it now.</strong> Click the bubble in the corner and ask about Brian's positions, priorities, or plans for Massachusetts.
          </p>
          <p className={styles.instructionP}>
            Notice how it responds clearly, provides detailed policy answers, and directs people to donate or volunteer when they&apos;re ready? That&apos;s all automated. And every part can be customized to reflect your voice, your platform, and your campaign branding in just days.
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
