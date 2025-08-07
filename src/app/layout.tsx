import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Task Tracker Lite',
  description: 'A simple task tracker app.',
};

const firebaseConfig = {
  "projectId": "task-tracker-lite-30hs3",
  "appId": "1:27162943729:web:9be4b63ad0aaaa03408950",
  "storageBucket": "task-tracker-lite-30hs3.firebasestorage.app",
  "apiKey": "AIzaSyA7jqjgddIRHeizqVNM7xgclLOQ2-YO--g",
  "authDomain": "task-tracker-lite-30hs3.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "27162943729"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__firebase_config = ${JSON.stringify(firebaseConfig)};
              window.__app_id = "${firebaseConfig.appId}";
            `,
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
