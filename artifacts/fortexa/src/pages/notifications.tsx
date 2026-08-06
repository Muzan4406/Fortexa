import { useGetAnnouncements } from '@workspace/api-client-react';
import { Bell, Megaphone, ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDate } from '@/lib/format';

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { data: announcements, isLoading } = useGetAnnouncements();

  return (
    <>
      {/* Header */}
      <div className="bg-background px-4 pt-8 pb-4 flex items-center gap-3 border-b border-border sticky top-0 z-10">
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">Messages de l'administration</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-1" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!announcements || announcements.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Aucune notification</p>
            <p className="text-sm text-muted-foreground">Les messages de l'admin apparaîtront ici.</p>
          </div>
        )}

        {!isLoading && announcements && announcements.map((notif, idx) => (
          <div
            key={notif.id ?? idx}
            className="bg-card rounded-2xl border border-border p-4 shadow-sm flex gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm mb-1">{notif.title}</p>
              <p className="text-sm text-muted-foreground leading-snug">{notif.message}</p>
              {notif.createdAt && (
                <p className="text-xs text-muted-foreground/70 mt-2">{formatDate(notif.createdAt)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
