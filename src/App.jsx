/**
 * Lucky Star Catcher.
 *
 * Three jars, one component: `view` decides which set of stars the jar is
 * holding right now.
 *
 *   home    your own memories
 *   inbox   stars from friends you haven't opened yet
 *   friend  everything you and one friend (or group) have traded
 *   account you
 *
 * A star that's currently open is filtered out of the jar, which is how it
 * "leaves" — and putting it back in the list is how it returns.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import NightSky from './components/NightSky.jsx';
import TopBar from './components/TopBar.jsx';
import MasonJar from './components/MasonJar.jsx';
import StarDefs from './components/StarDefs.jsx';
import UnfoldOverlay from './components/UnfoldOverlay.jsx';
import ComposeSheet from './components/ComposeSheet.jsx';
import SendSheet from './components/SendSheet.jsx';
import FriendsSheet from './components/FriendsSheet.jsx';
import AccountPage from './components/AccountPage.jsx';
import { starService } from './services/starService.js';
import { useSessionQueue } from './hooks/useSessionQueue.js';

import './styles/global.css';
import './styles/sky.css';
import './styles/jar.css';
import './styles/unfold.css';

export default function App() {
  const [data, setData] = useState({ stars: [], friends: [], user: null });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState({ name: 'home' });
  const [openStarId, setOpenStarId] = useState(null);
  const [sheet, setSheet] = useState(null); // 'compose' | 'friends' | {name, …}
  const [toast, setToast] = useState('');
  const [pulledOnce, setPulledOnce] = useState(false);

  const jarRef = useRef(null);
  const previousInboxCount = useRef(0);
  const { pick, markSeen, reset: resetQueue } = useSessionQueue();

  /* --- Load ---------------------------------------------------------------- */
  useEffect(() => {
    starService.load().then((snapshot) => {
      setData(snapshot);
      previousInboxCount.current = snapshot.stars.filter(
        (s) => s.jarId === 'inbox'
      ).length;
      setLoading(false);
    });
  }, []);

  /* --- Derived jars -------------------------------------------------------- */
  const friendsById = useMemo(
    () => Object.fromEntries(data.friends.map((f) => [f.id, f])),
    [data.friends]
  );

  const starsIn = (jarId) => data.stars.filter((s) => s.jarId === jarId);

  const inboxStars = useMemo(() => starsIn('inbox'), [data.stars]);
  const inboxCount = inboxStars.length;

  const currentJarId =
    view.name === 'home'
      ? 'main'
      : view.name === 'inbox'
      ? 'inbox'
      : view.name === 'friend'
      ? `friend:${view.id}`
      : null;

  const jarStars = useMemo(
    () => data.stars.filter((s) => s.jarId === currentJarId),
    [data.stars, currentJarId]
  );

  // The star being read is out of the jar, so it isn't drawn inside it.
  const starsInJar = jarStars.filter((s) => s.id !== openStarId);
  const openStar = data.stars.find((s) => s.id === openStarId) || null;

  /* --- Notifications ------------------------------------------------------- */
  useEffect(() => {
    if (loading) return;
    if (inboxCount > previousInboxCount.current) {
      const newest = inboxStars[inboxStars.length - 1];
      const from = friendsById[newest?.authorId]?.name || 'someone';
      showToast(`A star arrived from ${from}`);
    }
    previousInboxCount.current = inboxCount;
  }, [inboxCount, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const toastTimer = useRef(null);
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  };

  /* --- Opening and closing stars ------------------------------------------ */

  const handlePullOut = (starId) => {
    setOpenStarId(starId);
    markSeen(starId);
    setPulledOnce(true);
  };

  const handleSurpriseMe = () => {
    const chosen = pick(starsInJar.map((s) => s.id));
    if (!chosen) return;
    jarRef.current?.shake();
    setOpenStarId(chosen);
    setPulledOnce(true);
  };

  const handleCloseStar = async () => {
    const star = openStar;
    setOpenStarId(null);
    // An inbox star, once read, settles into that friend's jar.
    if (star?.jarId === 'inbox') {
      const snapshot = await starService.openReceivedStar(star.id);
      setData(snapshot);
      const from = friendsById[star.authorId]?.name || 'your friend';
      showToast(`Tucked into ${from}'s jar`);
    }
  };

  /* --- Actions offered on an open star ------------------------------------ */

  const actionsForOpenStar = () => {
    if (!openStar) return [];
    const mine = openStar.authorId === starService.currentUser.id;
    const actions = [];

    if (openStar.jarId === 'main') {
      actions.push({
        label: 'Send to a friend',
        tone: 'primary',
        onClick: (star) => {
          setOpenStarId(null);
          setSheet({ name: 'send', starId: star.id });
        },
      });
    }

    if (!mine) {
      actions.push({
        label: 'Keep in my jar',
        tone: 'primary',
        onClick: async (star) => {
          const snapshot = await starService.copyToMainJar(star.id);
          setData(snapshot);
          showToast('Copied into your jar');
        },
      });
    }

    return actions;
  };

  /* --- Writes -------------------------------------------------------------- */

  const saveNewStar = async (draft) => {
    const snapshot = await starService.addStar(draft);
    setData(snapshot);
    setSheet(null);
    resetQueue();
    showToast('Folded and dropped in');
  };

  /** Fold a memory straight into a friend's jar, from their own page. */
  const foldAndSend = async (draft) => {
    const friendId = sheet.friendId;
    const snapshot = await starService.foldAndSend(draft, [friendId]);
    setData(snapshot);
    setSheet(null);
    resetQueue();
    showToast(`Sent to ${friendsById[friendId]?.name || 'your friend'}`);
  };

  const sendStar = async (recipientIds) => {
    const snapshot = await starService.sendStar(sheet.starId, recipientIds);
    setData(snapshot);
    setSheet(null);
    const names = recipientIds.map((id) => friendsById[id]?.name).filter(Boolean);
    showToast(`Sent to ${names.join(' and ')}`);
  };

  const addFriend = async (draft) => {
    const snapshot = await starService.addFriend(draft);
    setData(snapshot);
    showToast(`${draft.name.trim()} has a jar now`);
  };

  const addGroup = async (draft) => {
    const snapshot = await starService.addGroup(draft);
    setData(snapshot);
    showToast(`${draft.name.trim()} is ready`);
  };

  const renameUser = async (name) => {
    const snapshot = await starService.updateUser({ name });
    setData(snapshot);
    showToast('Name updated');
  };

  const resetEverything = async () => {
    const snapshot = await starService.reset();
    setData(snapshot);
    setView({ name: 'home' });
    resetQueue();
    showToast('Back to the beginning');
  };

  const simulateIncoming = async () => {
    const friend = data.friends[Math.floor(Math.random() * data.friends.length)];
    const snapshot = await starService.simulateIncoming(
      friend.id,
      'Thinking about that night on the roof.'
    );
    setData(snapshot);
    setSheet(null);
  };

  /* --- View chrome --------------------------------------------------------- */

  const viewFriend = view.name === 'friend' ? friendsById[view.id] : null;

  // On a friend's page their name sits under the jar, so the bar stays empty
  // above it rather than saying it twice.
  const title =
    view.name === 'home'
      ? 'Your jar'
      : view.name === 'inbox'
      ? 'Waiting for you'
      : view.name === 'account'
      ? 'Your account'
      : undefined;

  const subtitle =
    view.name === 'home'
      ? `${starsIn('main').length} memories folded up`
      : view.name === 'inbox'
      ? `${inboxCount} unopened`
      : view.name === 'friend'
      ? `${jarStars.length} star${jarStars.length === 1 ? '' : 's'}`
      : undefined;

  const emptyMessage =
    view.name === 'inbox'
      ? 'No stars waiting. The sky is quiet.'
      : view.name === 'friend'
      ? 'Send the first star.'
      : 'Fold your first memory below.';

  const accountStats = useMemo(() => {
    const me = data.user?.id;
    return {
      folded: data.stars.filter((s) => s.jarId === 'main' && s.authorId === me)
        .length,
      sent: data.stars.filter(
        (s) => s.jarId?.startsWith('friend:') && s.authorId === me
      ).length,
      received: data.stars.filter((s) => s.authorId && s.authorId !== me).length,
      waiting: inboxCount,
    };
  }, [data.stars, data.user, inboxCount]);

  if (loading) {
    return (
      <div className="app">
        <NightSky shootingCount={0} />
      </div>
    );
  }

  const showsJar = view.name !== 'account';

  return (
    <div className="app">
      <StarDefs />
      <NightSky shootingCount={view.name === 'home' ? inboxCount : 0} />

      <div className={'app__stage' + (openStar ? ' app__stage--behind' : '')}>
        <TopBar
          title={title}
          subtitle={subtitle}
          inboxCount={inboxCount}
          user={data.user}
          onInboxClick={() => setView({ name: 'inbox' })}
          onAccountClick={() => setView({ name: 'account' })}
          onBack={view.name === 'home' ? undefined : () => setView({ name: 'home' })}
        />

        {showsJar ? (
          <div className="jar-stage">
            <MasonJar
              ref={jarRef}
              key={currentJarId} /* a new jar means a fresh physics world */
              stars={starsInJar}
              label={view.name === 'friend' ? viewFriend?.name : undefined}
              labelMeta={
                view.name === 'friend' && viewFriend?.kind === 'group'
                  ? viewFriend.members?.join(' · ')
                  : undefined
              }
              emptyMessage={emptyMessage}
              showHint={view.name === 'home' && !pulledOnce}
              onPullOut={handlePullOut}
            />
          </div>
        ) : (
          <AccountPage
            user={data.user}
            stats={accountStats}
            friends={data.friends}
            onRename={renameUser}
            onReset={resetEverything}
          />
        )}

        <div className="dock">
          {view.name === 'home' && (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setSheet('compose')}
              >
                Fold a memory
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSurpriseMe}
                disabled={starsInJar.length === 0}
              >
                Surprise me
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSheet('friends')}
              >
                Friends
              </button>
            </>
          )}

          {view.name === 'inbox' && inboxCount > 0 && (
            <button type="button" className="btn btn--gold" onClick={handleSurpriseMe}>
              Open one
            </button>
          )}

          {view.name === 'friend' && viewFriend && (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() =>
                  setSheet({ name: 'compose-send', friendId: viewFriend.id })
                }
              >
                Send a star to {viewFriend.name}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSurpriseMe}
                disabled={starsInJar.length === 0}
              >
                Surprise me
              </button>
            </>
          )}
        </div>
      </div>

      {openStar && (
        <UnfoldOverlay
          star={openStar}
          authorName={
            openStar.authorId === starService.currentUser.id
              ? undefined
              : friendsById[openStar.authorId]?.name
          }
          actions={actionsForOpenStar()}
          onClose={handleCloseStar}
        />
      )}

      {sheet === 'compose' && (
        <ComposeSheet onSave={saveNewStar} onCancel={() => setSheet(null)} />
      )}

      {sheet?.name === 'compose-send' && (
        <ComposeSheet
          sendToName={friendsById[sheet.friendId]?.name}
          onSave={foldAndSend}
          onCancel={() => setSheet(null)}
        />
      )}

      {sheet === 'friends' && (
        <FriendsSheet
          friends={data.friends}
          countFor={(id) => starsIn(`friend:${id}`).length}
          onOpenJar={(id) => {
            setSheet(null);
            setView({ name: 'friend', id });
          }}
          onAddFriend={addFriend}
          onAddGroup={addGroup}
          onSimulateIncoming={simulateIncoming}
          onCancel={() => setSheet(null)}
        />
      )}

      {sheet?.name === 'send' && (
        <SendSheet
          friends={data.friends}
          onSend={sendStar}
          onCancel={() => setSheet(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
