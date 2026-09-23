export type FaithCourseLesson = {
  title: string;
  references: string[];
  focus: string;
};

export type FaithCourse = {
  slug: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  level: "Foundations" | "Growing" | "Deep Dive";
  estimatedMinutes: number;
  featured?: boolean;
  examples: string[];
  lessons: FaithCourseLesson[];
};

const lesson = (title: string, references: string[], focus: string): FaithCourseLesson => ({
  title,
  references,
  focus,
});

const course = (
  slug: string,
  title: string,
  category: string,
  description: string,
  cover: string,
  level: FaithCourse["level"],
  lessons: FaithCourseLesson[],
  examples: string[] = [],
  featured = false,
): FaithCourse => ({
  slug,
  title,
  category,
  description,
  cover,
  level,
  estimatedMinutes: Math.max(45, lessons.length * 18),
  featured,
  examples,
  lessons,
});

export const FAITH_COURSES: FaithCourse[] = [
  course(
    "understanding-baptism",
    "Understanding Baptism",
    "Foundations",
    "Explore what baptism means, why Jesus commanded it, how the early church practised it, and how Christians live out their baptism afterward. The course also names where Christian traditions differ without pretending those differences do not exist.",
    "asset:topic-discipleship",
    "Foundations",
    [
      lesson("What baptism is", ["Matthew 28:18-20", "Acts 2:37-41"], "Start with Jesus' command and the first Christian responses to the gospel."),
      lesson("Union with Christ", ["Romans 6:1-11", "Galatians 3:26-29"], "Understand baptism as a sign of belonging to Christ and sharing in his death and resurrection."),
      lesson("Water, faith and repentance", ["Acts 8:26-39", "Acts 10:44-48"], "Notice how faith, repentance, the Spirit and baptism appear together in Acts."),
      lesson("Why churches practise baptism differently", ["Acts 16:25-34", "Colossians 2:11-13"], "Learn the biblical passages behind different Christian convictions about candidates, timing and mode."),
      lesson("Living after baptism", ["Colossians 3:1-17", "1 Peter 2:9-12"], "Move from the event of baptism into a life of worship, holiness, service and belonging."),
    ],
    ["A new believer preparing for baptism", "Someone baptised as a child who wants to understand it personally", "A youth group comparing church traditions respectfully"],
    true,
  ),
  course(
    "salvation-and-new-life",
    "Salvation & New Life in Christ",
    "Foundations",
    "Follow the Bible's story of sin, grace, faith, repentance, justification, adoption and transformation without reducing salvation to a single slogan.",
    "asset:cross-sunrise",
    "Foundations",
    [
      lesson("Why we need rescue", ["Genesis 3:1-24", "Romans 3:21-26"], "See sin as broken relationship, guilt and power, not only bad behaviour."),
      lesson("Grace before achievement", ["Ephesians 2:1-10", "Titus 3:3-7"], "Understand salvation as God's gift rather than something earned."),
      lesson("Faith and repentance", ["Mark 1:14-15", "Acts 2:37-39"], "Explore turning toward Christ with trust, honesty and obedience."),
      lesson("Justified and adopted", ["Romans 5:1-11", "Romans 8:14-17"], "See both a changed standing before God and a new family identity."),
      lesson("A transformed life", ["2 Corinthians 5:14-21", "Galatians 5:16-26"], "Learn how grace produces a new way of living rather than passive belief."),
    ],
    ["A student carrying shame from past choices", "A church member who knows Christian words but not their meaning", "A new believer asking what changes after conversion"],
    true,
  ),
  course(
    "how-to-pray",
    "How to Pray",
    "Prayer",
    "Build a biblical prayer life that includes worship, confession, thanksgiving, asking, listening through Scripture, persistence and honest lament.",
    "asset:topic-prayer",
    "Foundations",
    [
      lesson("Jesus teaches us to pray", ["Matthew 6:5-13"], "Use the Lord's Prayer as a pattern rather than a formula to rush through."),
      lesson("Honest prayer", ["Psalm 13", "Psalm 62:5-8"], "Learn that biblical prayer makes room for fear, anger, grief and trust."),
      lesson("Asking and surrendering", ["Luke 11:5-13", "Luke 22:39-46"], "Hold bold requests together with surrender to God's will."),
      lesson("Praying with Scripture", ["Psalm 23", "Ephesians 1:15-23"], "Turn biblical truth into praise, confession and intercession."),
      lesson("A sustainable prayer rhythm", ["1 Thessalonians 5:16-18", "Colossians 4:2-4"], "Build habits that fit real life rather than depending on emotion."),
    ],
    ["Praying before an exam", "Praying when a family situation does not change quickly", "Using one Psalm slowly instead of trying to find perfect words"],
    true,
  ),
  course(
    "fasting-and-spiritual-discipline",
    "Fasting & Spiritual Discipline",
    "Prayer",
    "Learn why Christians fast, what fasting can and cannot do, how it connects to prayer, justice and self-control, and how to practise it wisely.",
    "asset:quiet-night",
    "Growing",
    [
      lesson("Why fast?", ["Matthew 6:16-18", "Matthew 9:14-17"], "See fasting as devotion to God, not spiritual performance."),
      lesson("Fasting and seeking God", ["Ezra 8:21-23", "Acts 13:1-3"], "Study biblical moments where fasting accompanies dependence and discernment."),
      lesson("The fast God desires", ["Isaiah 58:1-12"], "Connect spiritual discipline with justice, generosity and changed behaviour."),
      lesson("Fasting without manipulation", ["2 Samuel 12:15-23", "Daniel 3:16-18"], "Reject the idea that fasting forces God to give a preferred outcome."),
      lesson("Building wise disciplines", ["1 Corinthians 9:24-27", "1 Timothy 4:7-10"], "Practise discipline in a way that serves love, health and long-term faithfulness."),
    ],
    ["A church fasting together before a major decision", "Choosing a social-media fast to create space for prayer", "Stopping a fast when health or safety requires it"],
    true,
  ),
  course(
    "walking-with-the-holy-spirit",
    "Walking With the Holy Spirit",
    "Holy Spirit",
    "Study who the Holy Spirit is, what the Spirit does, how believers are led, how fruit grows, and how spiritual gifts serve the church.",
    "asset:topic-faith",
    "Growing",
    [
      lesson("Who is the Holy Spirit?", ["John 14:15-27", "Acts 5:1-4"], "Meet the Spirit as personal and divine, not merely a feeling or force."),
      lesson("The Spirit and new life", ["John 3:1-8", "Romans 8:1-17"], "Understand the Spirit's work in regeneration, assurance and freedom."),
      lesson("Led by the Spirit", ["Galatians 5:13-26", "Romans 12:1-2"], "Discern guidance through Scripture-shaped character rather than impulse alone."),
      lesson("Fruit of the Spirit", ["Galatians 5:22-25", "John 15:1-8"], "Measure spiritual growth by Christlike fruit, not dramatic experiences alone."),
      lesson("Gifts for serving others", ["1 Corinthians 12:4-27", "1 Peter 4:7-11"], "See gifts as grace given for the good of the whole body."),
    ],
    ["Choosing patience in conflict instead of calling anger 'boldness'", "Testing an impression against Scripture and wise counsel", "Using a gift quietly to strengthen someone else"],
    true,
  ),
  course(
    "understanding-the-bible",
    "Understanding the Bible",
    "Bible",
    "Learn how the Bible fits together, how context changes interpretation, how genres work, and how to move from reading to faithful application.",
    "asset:bible-candle",
    "Foundations",
    [
      lesson("One story, many books", ["Genesis 12:1-3", "Luke 24:25-27"], "Trace creation, covenant, Israel, Jesus, church and new creation."),
      lesson("Read in context", ["Philippians 4:10-20", "Jeremiah 29:1-14"], "Learn why verses mean more when read inside paragraphs, books and history."),
      lesson("Genres matter", ["Psalm 1", "Proverbs 26:4-5", "Luke 15:1-32"], "Read poetry, wisdom, narrative, prophecy and letters according to their form."),
      lesson("From meaning to application", ["James 1:19-27", "2 Timothy 3:14-17"], "Apply what a passage actually teaches instead of forcing it onto every situation."),
      lesson("Read with the church", ["Acts 17:10-12", "Nehemiah 8:1-12"], "Combine personal study with teaching, community and humility."),
    ],
    ["Reading Jeremiah 29:11 inside the letter to exiles", "Not treating every Proverb as an unconditional promise", "Asking what a command meant to its first hearers before applying it"],
    true,
  ),
  course(
    "christian-relationships-and-dating",
    "Christian Relationships & Dating",
    "Relationships",
    "Think biblically about attraction, boundaries, character, communication, singleness, dating and decisions without turning Scripture into a dating manual.",
    "asset:topic-relationships",
    "Growing",
    [
      lesson("Identity before romance", ["Colossians 3:1-14", "1 Corinthians 7:32-35"], "Refuse to make a relationship responsible for your worth."),
      lesson("Character and attraction", ["Proverbs 4:23", "Galatians 5:22-23"], "Value chemistry without ignoring character, wisdom and fruit."),
      lesson("Boundaries that protect love", ["1 Thessalonians 4:1-8", "1 Corinthians 6:12-20"], "Understand boundaries as a way of honouring God, self and the other person."),
      lesson("Communication and conflict", ["James 1:19-20", "Ephesians 4:25-32"], "Practise truth, listening, forgiveness and repair."),
      lesson("Discernment and wise counsel", ["Proverbs 15:22", "Philippians 1:9-11"], "Make relationship decisions with prayer, evidence and trusted community."),
    ],
    ["Being attracted to someone whose character raises concerns", "Setting a boundary without shaming the other person", "Knowing when repeated disrespect is not a small communication issue"],
    true,
  ),
  course(
    "spiritual-warfare",
    "Spiritual Warfare",
    "Spiritual Growth",
    "Study spiritual opposition soberly through Scripture, focusing on Christ's victory, truth, prayer, holiness and resistance rather than fear or superstition.",
    "asset:topic-hope-healing",
    "Deep Dive",
    [
      lesson("Christ has already won", ["Colossians 2:13-15", "Hebrews 2:14-18"], "Begin spiritual warfare from Jesus' victory rather than panic."),
      lesson("The armour of God", ["Ephesians 6:10-20"], "See truth, righteousness, gospel peace, faith, salvation, Scripture and prayer as daily practices."),
      lesson("Resist without obsession", ["James 4:7-10", "1 Peter 5:6-11"], "Resist evil while remaining humble, alert and grounded."),
      lesson("Temptation and lies", ["Genesis 3:1-7", "Matthew 4:1-11"], "Notice how deception works and how Jesus answers with rightly used Scripture."),
      lesson("Prayer, community and wisdom", ["Acts 12:1-17", "Hebrews 10:23-25"], "Fight isolation by bringing fear and struggle into prayerful community."),
    ],
    ["Refusing to label every setback as a demonic attack", "Answering shame with the truth of the gospel", "Seeking pastoral and professional help when a problem also has emotional or medical dimensions"],
    true,
  ),
  course(
    "discovering-your-purpose",
    "Discovering Your Purpose",
    "Purpose",
    "Move from pressure to a biblical understanding of purpose rooted in identity, gifts, ordinary faithfulness, service and wise decisions.",
    "asset:topic-faith-purpose",
    "Growing",
    [
      lesson("Created before called", ["Genesis 1:26-28", "Ephesians 2:8-10"], "Root purpose in God's grace and image before career or achievement."),
      lesson("Gifts and service", ["Romans 12:3-8", "1 Peter 4:10-11"], "Discover gifts by serving instead of waiting for a perfect label."),
      lesson("Purpose in ordinary work", ["Colossians 3:22-24", "1 Thessalonians 4:9-12"], "See daily responsibility as part of calling."),
      lesson("Waiting seasons", ["Psalm 27:13-14", "James 5:7-11"], "Learn patience without passivity."),
      lesson("Making decisions", ["Proverbs 3:5-7", "Romans 12:1-2"], "Use wisdom, character, counsel and opportunity rather than chasing signs."),
    ],
    ["A student unsure whether their course is their calling", "Someone serving faithfully without public recognition", "Choosing between two good opportunities without fear of 'missing God's plan'"],
    true,
  ),
  course(
    "becoming-a-disciple-of-jesus",
    "Becoming a Disciple of Jesus",
    "Discipleship",
    "Understand discipleship as learning Jesus' way of life: following, obeying, becoming like him, joining his people and helping others follow.",
    "asset:topic-discipleship",
    "Foundations",
    [
      lesson("Come and follow", ["Mark 1:14-20", "Luke 9:23-25"], "See discipleship as allegiance and apprenticeship, not content consumption."),
      lesson("Abide in Jesus", ["John 15:1-17"], "Learn the relationship between remaining in Christ, prayer, obedience and fruit."),
      lesson("Practise Jesus' teaching", ["Matthew 7:24-29", "James 1:22-25"], "Move from knowing Christian ideas to living them."),
      lesson("Belong to a people", ["Acts 2:42-47", "Hebrews 10:23-25"], "Understand why discipleship is communal rather than private."),
      lesson("Make disciples", ["Matthew 28:18-20", "2 Timothy 2:1-2"], "Pass on what you are learning with humility and patience."),
    ],
    ["Learning one teaching of Jesus and practising it for a week", "Joining a small group instead of trying to grow alone", "Mentoring someone younger without pretending to know everything"],
    true,
  ),

  // Expanded pilot library: concise but usable course outlines that can grow
  // without introducing a second learning database before the pilot proves it is needed.
  ...[
    ["the-trinity","Understanding the Trinity","Theology","Learn why Christians confess one God as Father, Son and Holy Spirit.","asset:topic-faith","Deep Dive",["Matthew 3:13-17","Matthew 28:18-20","John 1:1-18","John 14:15-27","2 Corinthians 13:14"]],
    ["grace","Living by Grace","Foundations","Understand grace as God's undeserved favour that saves, trains and transforms.","asset:cross-sunrise","Foundations",["Ephesians 2:1-10","Romans 5:1-11","Titus 2:11-14","2 Corinthians 12:7-10","Hebrews 4:14-16"]],
    ["repentance","Repentance and Returning to God","Foundations","Study biblical repentance as a changed mind, direction and relationship with God.","asset:topic-prayer","Foundations",["Mark 1:14-15","Psalm 51","Luke 15:11-32","Acts 3:17-21","2 Corinthians 7:8-11"]],
    ["communion","Understanding Holy Communion","Church","Explore the Lord's Supper through Jesus, Paul and the worshipping church.","asset:church-interior","Growing",["Luke 22:14-23","1 Corinthians 10:14-22","1 Corinthians 11:17-34","John 6:35-40","Acts 2:42-47"]],
    ["the-church","Why the Church Matters","Church","Understand the church as Christ's body, family, temple and witness.","asset:church-interior","Foundations",["Matthew 16:13-20","Acts 2:42-47","1 Corinthians 12:12-27","Ephesians 2:11-22","1 Peter 2:4-12"]],
    ["worship","A Life of Worship","Worship","Move beyond songs into worship as whole-life response to God's worth.","asset:worship-night","Growing",["Psalm 95","John 4:19-26","Romans 12:1-2","Colossians 3:12-17","Hebrews 13:15-16"]],
    ["identity-in-christ","Identity in Christ","Identity","Replace performance-driven identity with the New Testament's language of belonging in Christ.","asset:topic-personal-growth","Growing",["2 Corinthians 5:14-21","Romans 8:1-17","Ephesians 1:3-14","Colossians 3:1-17","1 Peter 2:9-12"]],
    ["forgiveness","Forgiveness and Reconciliation","Christian Living","Learn what forgiveness is, what it is not, and how reconciliation relates to repentance, safety and truth.","asset:topic-relationships","Growing",["Matthew 18:21-35","Luke 17:1-4","Romans 12:14-21","Ephesians 4:25-32","Colossians 3:12-15"]],
    ["anxiety-and-peace","Anxiety, Fear and God's Peace","Wellbeing","Explore biblical peace without using faith to dismiss real emotional or clinical struggle.","asset:topic-mental-health","Growing",["Psalm 42","Matthew 6:25-34","Philippians 4:4-9","1 Peter 5:6-11","Romans 8:31-39"]],
    ["grief","Faith Through Grief","Wellbeing","Learn biblical lament, presence, hope and how to walk with people who grieve.","asset:topic-hope-healing","Growing",["Psalm 13","John 11:17-44","1 Thessalonians 4:13-18","2 Corinthians 1:3-7","Revelation 21:1-5"]],
    ["temptation","Facing Temptation","Spiritual Growth","Understand temptation, desire, escape, grace and practical resistance.","asset:quiet-night","Growing",["Genesis 39:1-23","Matthew 4:1-11","1 Corinthians 10:1-13","James 1:12-18","Hebrews 4:14-16"]],
    ["wisdom","Biblical Wisdom for Daily Life","Bible","Learn how Proverbs, Jesus and the apostles shape wise everyday decisions.","asset:topic-life-skills","Growing",["Proverbs 1:1-7","Proverbs 3:1-12","Matthew 7:24-29","James 1:5-8","James 3:13-18"]],
    ["money","Money, Generosity and Contentment","Christian Living","Study money as stewardship, temptation, provision and opportunity for generosity.","asset:topic-life-skills","Growing",["Matthew 6:19-34","Luke 12:13-34","2 Corinthians 8:1-15","1 Timothy 6:6-19","Philippians 4:10-20"]],
    ["work","Faith and Work","Purpose","Connect study, employment, business and ordinary work with Christian faithfulness.","asset:walk-purpose","Growing",["Genesis 2:4-15","Proverbs 22:29","Colossians 3:22-24","1 Thessalonians 4:9-12","Ephesians 4:28"]],
    ["leadership","Servant Leadership","Leadership","Learn leadership shaped by Jesus: service, character, courage, accountability and care.","asset:topic-personal-growth","Growing",["Mark 10:35-45","John 13:1-17","1 Timothy 3:1-13","1 Peter 5:1-5","Nehemiah 2:11-20"]],
    ["friendship","Faithful Friendship","Relationships","Build friendships marked by loyalty, honesty, boundaries, encouragement and wisdom.","asset:friends-dusk","Growing",["1 Samuel 18:1-4","Proverbs 17:17","Proverbs 27:5-17","John 15:12-17","Ecclesiastes 4:9-12"]],
    ["family","Faith in the Family","Relationships","Explore honour, responsibility, conflict, grace and spiritual life within families.","asset:friends-dusk","Growing",["Deuteronomy 6:4-9","Luke 2:41-52","Ephesians 6:1-4","Colossians 3:12-21","2 Timothy 1:3-7"]],
    ["marriage","Christian Marriage","Relationships","Study covenant, mutual service, communication, sexuality and faithfulness in marriage.","asset:topic-relationships","Deep Dive",["Genesis 2:18-25","Matthew 19:1-12","1 Corinthians 7:1-16","Ephesians 5:21-33","1 Peter 3:1-9"]],
    ["singleness","Faithful Singleness","Relationships","See singleness as a full Christian life rather than a waiting room for marriage.","asset:topic-personal-growth","Growing",["Matthew 19:10-12","1 Corinthians 7:25-40","Philippians 4:10-13","Psalm 16","Isaiah 56:1-8"]],
    ["sexual-integrity","Sexual Integrity","Christian Living","Study desire, holiness, dignity, boundaries, repentance and grace without shame-based teaching.","asset:topic-relationships","Deep Dive",["Genesis 1:26-31","1 Corinthians 6:12-20","1 Thessalonians 4:1-8","Matthew 5:27-30","John 8:1-11"]],
    ["social-media","Faith in a Social Media World","Life Skills","Think Christianly about attention, comparison, speech, image, truth and online habits.","asset:topic-life-skills","Growing",["Psalm 101","Proverbs 4:20-27","Matthew 6:1-6","Ephesians 4:25-32","Philippians 4:8-9"]],
    ["service","Serving Like Jesus","Discipleship","Discover service as a normal expression of discipleship rather than a platform for recognition.","asset:topic-discipleship","Foundations",["Mark 10:42-45","John 13:1-17","Romans 12:3-13","Galatians 5:13-14","1 Peter 4:7-11"]],
    ["evangelism","Sharing Your Faith","Mission","Learn to witness with clarity, humility, courage and respect.","asset:topic-faith-purpose","Growing",["Matthew 5:13-16","Acts 17:16-34","1 Corinthians 2:1-5","Colossians 4:2-6","1 Peter 3:13-17"]],
    ["mission","God's Mission in the World","Mission","Trace God's mission from Abraham to the nations and the church's calling today.","asset:mountain-dawn","Deep Dive",["Genesis 12:1-3","Isaiah 49:1-6","Matthew 28:18-20","Acts 1:6-11","Revelation 7:9-12"]],
    ["justice-and-mercy","Justice, Mercy and Compassion","Christian Living","Study God's concern for justice, the vulnerable, generosity and faithful action.","asset:topic-hope-healing","Growing",["Micah 6:6-8","Isaiah 58:1-12","Luke 10:25-37","James 2:1-17","Matthew 25:31-46"]],
    ["stewardship","Stewardship of Time and Gifts","Life Skills","Use time, ability, money and opportunities as entrusted gifts rather than possessions without purpose.","asset:topic-life-skills","Growing",["Genesis 1:26-31","Matthew 25:14-30","Luke 16:1-13","1 Peter 4:7-11","Ephesians 5:15-17"]],
    ["spiritual-gifts","Understanding Spiritual Gifts","Holy Spirit","Explore gifts, discernment, love and service without turning gifts into status.","asset:topic-faith","Deep Dive",["Romans 12:3-8","1 Corinthians 12:1-31","1 Corinthians 13","1 Corinthians 14:1-12","1 Peter 4:7-11"]],
    ["hearing-god","Hearing God Biblically","Spiritual Growth","Learn discernment anchored in Scripture, wisdom, character, community and humility.","asset:topic-prayer","Deep Dive",["1 Samuel 3:1-21","John 10:1-18","Romans 12:1-2","1 John 4:1-6","Proverbs 11:14"]],
    ["sabbath","Rest, Sabbath and Limits","Christian Living","Study rest as trust, worship and human limitation rather than laziness.","asset:quiet-night","Growing",["Genesis 2:1-3","Exodus 20:8-11","Mark 2:23-28","Hebrews 4:1-11","Psalm 127"]],
    ["spiritual-habits","Building Spiritual Habits","Discipleship","Build sustainable practices of Scripture, prayer, worship, generosity and community.","asset:topic-discipleship","Growing",["Daniel 6:1-10","Mark 1:35-39","Acts 2:42-47","1 Timothy 4:7-16","Hebrews 10:23-25"]],
    ["decision-making","Making Wise Decisions","Life Skills","Use Scripture, wisdom, counsel, character, freedom and practical evidence in decisions.","asset:walk-purpose","Growing",["Proverbs 3:1-8","Proverbs 15:22","Romans 12:1-2","James 1:5-8","Acts 15:1-35"]],
    ["doubt","Faith and Doubt","Spiritual Growth","Bring questions to God honestly while learning the difference between doubt, unbelief and faithful investigation.","asset:quiet-night","Growing",["Psalm 73","Mark 9:14-29","John 20:24-31","Jude 20-23","Habakkuk 1:1-11"]],
    ["suffering","Faith in Suffering","Spiritual Growth","Study lament, endurance, presence, hope and the limits of easy explanations.","asset:topic-hope-healing","Deep Dive",["Job 1:1-22","Psalm 22","Romans 5:1-5","2 Corinthians 4:7-18","1 Peter 1:3-9"]],
    ["hope","Christian Hope","Foundations","Understand biblical hope as confidence in God's future that changes how we live now.","asset:cross-sunrise","Foundations",["Psalm 42","Romans 5:1-5","Romans 8:18-30","1 Peter 1:3-9","Revelation 21:1-5"]],
    ["resurrection","The Resurrection of Jesus","Theology","Explore the historical, theological and practical importance of Jesus' resurrection.","asset:cross-sunrise","Deep Dive",["Luke 24:1-35","John 20:1-31","Acts 2:22-36","1 Corinthians 15:1-28","1 Corinthians 15:35-58"]],
    ["second-coming","The Return of Christ","Theology","Study Christian hope about Christ's return without date-setting or speculation.","asset:mountain-dawn","Deep Dive",["Matthew 24:36-51","Acts 1:6-11","1 Thessalonians 4:13-18","2 Peter 3:8-14","Revelation 21:1-5"]],
    ["psalms","Praying the Psalms","Bible","Learn to use Psalms of praise, lament, trust, confession and thanksgiving in prayer.","asset:bible-candle","Growing",["Psalm 1","Psalm 23","Psalm 51","Psalm 88","Psalm 103"]],
    ["proverbs","Wisdom From Proverbs","Bible","Read Proverbs as wisdom for formation rather than a collection of automatic promises.","asset:topic-life-skills","Growing",["Proverbs 1:1-7","Proverbs 3:1-12","Proverbs 4:20-27","Proverbs 11:1-14","Proverbs 31:10-31"]],
    ["gospel-of-john","Journey Through John's Gospel","Bible","Follow John's portrait of Jesus through signs, conversations, the cross and resurrection.","asset:bible-candle","Deep Dive",["John 1","John 3","John 6","John 13","John 20"]],
    ["romans","Journey Through Romans","Bible","Explore Paul's explanation of sin, grace, faith, life in the Spirit and transformed community.","asset:topic-faith","Deep Dive",["Romans 1","Romans 3","Romans 5","Romans 8","Romans 12"]],
    ["sermon-on-the-mount","The Sermon on the Mount","Bible","Study Jesus' vision of kingdom character, prayer, relationships, trust and obedience.","asset:mountain-dawn","Deep Dive",["Matthew 5:1-20","Matthew 5:21-48","Matthew 6:1-18","Matthew 6:19-34","Matthew 7:1-29"]],
    ["fruit-of-the-spirit","The Fruit of the Spirit","Holy Spirit","Explore how the Spirit forms Christlike character over time.","asset:topic-personal-growth","Growing",["Galatians 5:13-26","John 15:1-17","1 Corinthians 13","Colossians 3:1-17","2 Peter 1:3-11"]],
    ["ten-commandments","Understanding the Ten Commandments","Bible","Read the commandments inside covenant, worship, love of God and love of neighbour.","asset:bible-candle","Growing",["Exodus 19:1-8","Exodus 20:1-17","Deuteronomy 6:1-9","Matthew 5:17-20","Matthew 22:34-40"]],
    ["kingdom-of-god","The Kingdom of God","Theology","Trace Jesus' central message of God's reign from promise to present mission and future hope.","asset:topic-faith-purpose","Deep Dive",["Daniel 7:9-14","Mark 1:14-15","Matthew 13:1-52","Luke 4:14-30","Revelation 11:15-19"]],
    ["covenant","Covenant Through the Bible","Theology","Follow God's covenant promises from Noah and Abraham through Israel to the new covenant in Christ.","asset:bible-candle","Deep Dive",["Genesis 9:8-17","Genesis 15","Exodus 19:1-8","2 Samuel 7:8-17","Jeremiah 31:31-34"]],
    ["anglican-worship","Understanding Anglican Worship","Church","Learn the shape of Anglican worship, Scripture, prayer, sacraments and the church year while keeping Christ at the centre.","asset:church-interior","Growing",["Acts 2:42-47","1 Corinthians 11:23-26","Colossians 3:12-17","1 Timothy 2:1-7","Revelation 5:6-14"]],
    ["confirmation","Preparing for Confirmation","Church","Explore personal profession of faith, baptismal promises, the Spirit, belonging and mature discipleship.","asset:church-interior","Growing",["Acts 8:14-17","Romans 10:8-13","Ephesians 1:13-14","1 Peter 3:15-16","Hebrews 6:1-3"]],
    ["christian-ethics","Christian Ethics in Real Life","Life Skills","Learn a framework for moral decisions shaped by Scripture, Jesus, wisdom, love, justice and community.","asset:topic-life-skills","Deep Dive",["Micah 6:8","Matthew 22:34-40","Romans 12:1-2","1 Corinthians 8:1-13","Philippians 1:9-11"]],
    ["mentoring","Biblical Mentoring","Leadership","Learn how mature believers can guide others through example, teaching, encouragement and accountability.","asset:friends-dusk","Growing",["1 Samuel 3:1-21","Acts 18:24-28","1 Corinthians 11:1","2 Timothy 2:1-2","Titus 2:1-8"]],
    ["youth-and-faith","Following Jesus as a Young Person","Discipleship","Explore identity, pressure, friendships, study, online life and courage through a young Christian lens.","asset:friends-dusk","Growing",["1 Timothy 4:12-16","Daniel 1","Psalm 119:9-16","Romans 12:1-2","Ecclesiastes 12:1-7"]],
  ].map(([slug,title,category,description,cover,level,refs]) => {
    const references = refs as string[];
    const lessonNames = ["Biblical foundation", "Understanding the context", "What this changes", "Real-life practice", "Growing with others"];
    return course(
      slug as string,
      title as string,
      category as string,
      description as string,
      cover as string,
      level as FaithCourse["level"],
      references.map((reference, index) =>
        lesson(
          lessonNames[index]!,
          [reference],
          `Study ${reference} carefully and connect its original context to the course theme without pulling the verse away from the surrounding passage.`,
        ),
      ),
      [
        "A personal decision where this teaching changes the next faithful step",
        "A conversation with a friend, mentor or church group where the principle can be practised",
        "A weekly habit that turns understanding into action",
      ],
    );
  }),
];

export const FEATURED_FAITH_COURSES = FAITH_COURSES.filter((item) => item.featured);
export const FAITH_COURSE_CATEGORIES = Array.from(new Set(FAITH_COURSES.map((item) => item.category)));

export function faithCourseBySlug(slug: string) {
  return FAITH_COURSES.find((item) => item.slug === slug) ?? null;
}
