export type UserRole = "member" | "admin" | "owner";

export type TournamentStatus = "upcoming" | "ongoing" | "finished";
export type MatchStatus = "pending" | "live" | "finished";
export type GameType =
  | "football"
  | "billiards"
  | "tennis"
  | "chess"
  | "other";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  game?: GameType;
  earnedAt: string;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  tournaments: number;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  winStreak: number;
  bestPlacement: number;
  mostPlayedTournament?: string;
  mostFacedOpponent?: string;
  rankingPoints: number;
}

export interface EquippedCosmetics {
  frameId?: string;
  titleId?: string;
  effectId?: string;
}

export interface Player {
  id: string;
  username: string;
  password: string;
  avatar: string;
  role: UserRole;
  /**
   * حساب مستورد من قائمة القروب ولم يعيّن صاحبه كلمة مرور بعد.
   * أول دخول: يوزر Plato + تعيين كلمة مرور → يدخل حسابه مباشرة.
   */
  unclaimed?: boolean;
  joinedAt: string;
  rank: string;
  bio?: string;
  coins: number;
  inventory: string[];
  equipped: EquippedCosmetics;
  tournamentsPlayed: number;
  tournamentsWon: number;
  winRate: number;
  matches: number;
  wins: number;
  losses: number;
  stats: PlayerStats;
  achievements: Achievement[];
  badges: string[];
  recentTournaments: string[];
  monthlyAward?: string;
  monthlyScore?: number;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  player1Id?: string;
  player2Id?: string;
  score1?: number | null;
  score2?: number | null;
  winnerId?: string;
  nextMatchId?: string;
}

/** فردي = لاعب واحد | ثنائي = أنت + تيمك (Duo) */
export type TournamentFormat = "solo" | "duo";

/** أين تظهر خانة التسجيل في الموقع */
export type RegistrationPlacement = "home" | "join" | "both";

/** فريق في بطولة جماعية (2 أو 3 لاعبين) */
export interface TournamentTeam {
  id: string;
  player1Id: string;
  player2Id: string;
  /** عضو ثالث اختياري (تيم من 3) */
  player3Id?: string;
  name: string;
}

/** طلب تسجيل — فردي أو تيم بانتظار المشرف */
export interface RegistrationRequest {
  id: string;
  username: string;
  userId?: string;
  teammateUsername?: string;
  teammateUserId?: string;
  /** العضو الثالث في التيم (اختياري) */
  teammate2Username?: string;
  teammate2UserId?: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  image: string;
  game: GameType;
  startDate: string;
  endDate: string;
  /** لاعبين (فردي) أو معرفات فرق (ثنائي) */
  participants: string[];
  /** فرق البطولة الثنائية */
  teams?: TournamentTeam[];
  /** فردي أو جماعي (Duo) */
  format?: TournamentFormat;
  /**
   * خانة تسجيل فقط — مو بطولة كاملة في قائمة البطولات.
   * يُنشأ من تبويب «تسجيل الأسامي».
   */
  registrationOnly?: boolean;
  /** رمز قصير لرابط المشاركة — تسجيل /j/xxxx · قرعة /t/xxxx */
  shareCode?: string;
  /** محذوف ناعماً — لا يظهر ولا يُستعاد بمزامنة جهاز قديم */
  deleted?: boolean;
  /** مكان ظهور خانة التسجيل: الرئيسية / صفحة التسجيل / الاثنين */
  registrationPlacement?: RegistrationPlacement;
  size: number;
  status: TournamentStatus;
  description: string;
  registrationOpen: boolean;
  /** موعد إغلاق التسجيل تلقائياً (ISO datetime) */
  registrationEndsAt?: string;
  /** تسجيلات الأسماء بانتظار موافقة المشرف */
  pendingRegistrations?: RegistrationRequest[];
  /** مفاتيح منح النقاط: matchId:win|loss:playerId — لمنع التكرار */
  rewardedMatchPlayerKeys?: string[];
  championId?: string;
  runnerUpId?: string;
  topScorerId?: string;
  bestPlayerId?: string;
  bestGoalkeeperId?: string;
  bracket: BracketMatch[];
  /** متى آخر تحديث للشجرة — يمنع المزامنة من خلط أماكن القرعة */
  bracketUpdatedAt?: string;
  prize?: string;
}

export interface VoteOption {
  id: string;
  label: string;
  votes: number;
}

export interface Vote {
  id: string;
  question: string;
  options: VoteOption[];
  active: boolean;
  createdAt: string;
  endsAt: string;
  totalVotes: number;
  votedBy: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: "announcement" | "results" | "rules" | "prize" | "schedule";
  image?: string;
  author: string;
  publishedAt: string;
  pinned?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "tournament" | "vote" | "result" | "news" | "shop" | "points";
  createdAt: string;
  read: boolean;
}

export interface HallOfFameEntry {
  id: string;
  playerId: string;
  title: string;
  reason: string;
  year: string;
}
