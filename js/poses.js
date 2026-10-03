/* Pose database.
 *
 * Fields
 *   id, name, sk (Sanskrit), lvl ('b' beginner | 'i' intermediate)
 *   pos   starting position, used to order a routine so you rarely jump up and down:
 *         'stand' | 'kneel' | 'seat' | 'prone' | 'supine'
 *   use   where it can appear in a routine: 'warm' | 'main' | 'cool' | 'final'
 *   tg    target areas (first one is the primary)
 *   br    breathing pattern key (see BREATH below)
 *   hold  beginner hold in seconds (per side when sides: true)
 *   steps, tip (easier option / caution), why
 *   fig   stick-figure description for js/figure.js, or an array of two frames
 *         (inhale frame, exhale frame) for poses that move with the breath.
 */
(function () {
  // Reusable body shapes
  const CROSS = { l1: [12, 165, 180], l2: [168, 15, 0] };        // seated cross-legged, front view
  const SIDE_SEAT = { l1: [15, 170, 180], l2: [8, 176, 180] };   // seated cross-legged, side view
  const TABLE = { t: -14, a1: [90, 90], a2: [89, 91], l1: [90, 180, 180], l2: [91, 179, 180] };
  const SUP = { t: 180, hd: 180 };                                // lying on back, head to the left
  const T_ARMS = { a1: [0, 2], a2: [180, 178] };
  const PRONE_LEGS = { l1: [180, 180, 180], l2: [181, 180, 180] };
  const W2_LEGS = { l1: [20, 90, 0], l2: [138, 138, 180] };       // warrior II stance, front view

  const BREATH = {
    steady:  { name: 'Flowing breath',    desc: 'Inhale 4 · Exhale 4',         seq: [['in', 4], ['out', 4]] },
    deepen:  { name: 'Deepening breath',  desc: 'Inhale 4 · Hold 2 · Exhale 6', seq: [['in', 4], ['hold', 2], ['out', 6]] },
    release: { name: 'Restoring breath',  desc: 'Inhale 4 · Hold 4 · Exhale 7', seq: [['in', 4], ['hold', 4], ['out', 7]] },
    balance: { name: 'Box breath',        desc: 'Inhale 4 · Hold 4 · Exhale 4 · Hold 4', seq: [['in', 4], ['hold', 4], ['out', 4], ['rest', 4]] }
  };

  const TARGETS = {
    lowBack: 'Low back', hips: 'Hips', hamstrings: 'Hamstrings', shoulders: 'Shoulders', neck: 'Neck',
    spine: 'Spine', chest: 'Chest', quads: 'Quads', core: 'Core', glutes: 'Glutes', sideBody: 'Side body',
    calves: 'Calves', balance: 'Balance'
  };

  const POSES = [
    // ───────────── Warm-ups ─────────────
    {
      id: 'mountain', name: 'Mountain Arm Sweeps', sk: 'Tadasana', lvl: 'b', pos: 'stand', use: ['warm'],
      tg: ['shoulders', 'spine'], br: 'steady', hold: 40,
      steps: ['Stand tall with feet hip-width apart and weight spread evenly through both feet.',
        'As you inhale, sweep your arms out and up overhead.',
        'As you exhale, float your arms back down by your sides.',
        'Let the glow lead the pace: arms rise as it grows, fall as it fades.'],
      tip: 'Keep a soft bend in your knees and let your ribs stay soft instead of flaring forward.',
      why: 'Wakes up the whole body and links your breath to movement.',
      fig: [{ t: -90, a1: [-50, -75], a2: [-130, -105], l1: [84, 90, 0], l2: [96, 90, 180] },
            { t: -90, a1: [70, 85], a2: [110, 95], l1: [84, 90, 0], l2: [96, 90, 180] }]
    },
    {
      id: 'sideBend', name: 'Standing Side Bend', sk: 'Parsva Tadasana', lvl: 'b', pos: 'stand', use: ['warm', 'main'],
      tg: ['sideBody', 'shoulders', 'spine'], br: 'deepen', hold: 25, sides: true,
      steps: ['Stand tall and reach both arms overhead, holding one wrist.',
        'Exhale and lean gently toward the side of the hand doing the holding.',
        'Press through the opposite foot so the whole side body lengthens.',
        'Keep your chest open toward the front instead of collapsing forward.'],
      tip: 'Rest one hand on your hip if reaching both arms up is too much.',
      why: 'Opens the muscles between the ribs and along the sides of the low back.',
      fig: { t: -72, c: -4, hd: -58, a1: [-50, -25], a2: [-78, -45], l1: [84, 90, 0], l2: [96, 90, 180] }
    },
    {
      id: 'neckRelease', name: 'Neck Release', lvl: 'b', pos: 'seat', use: ['warm', 'cool'],
      tg: ['neck', 'shoulders'], br: 'release', hold: 30, sides: true,
      steps: ['Sit tall, cross-legged or on a chair.',
        'Tilt one ear toward the same shoulder.',
        'Rest that hand lightly on your head, letting its weight do the work. Don\'t pull.',
        'Reach the other fingertips toward the floor to deepen the stretch.'],
      tip: 'Go gently. The stretch should feel mild along the side of your neck.',
      why: 'Releases tension that builds in the neck and upper shoulders from screens and desks.',
      fig: Object.assign({ t: -90, hd: -55, a1: [-60, 180], a2: [100, 100] }, CROSS)
    },
    {
      id: 'shoulderRolls', name: 'Seated Shoulder Rolls', lvl: 'b', pos: 'seat', use: ['warm'],
      tg: ['shoulders', 'neck'], br: 'steady', hold: 40,
      steps: ['Sit tall with your hands resting on your thighs.',
        'Inhale and lift your shoulders up toward your ears.',
        'Exhale and roll them back and down, sliding your shoulder blades down your back.',
        'Halfway through, reverse the direction.'],
      tip: 'Make the circles slow and as big as feels comfortable.',
      why: 'Warms the shoulder joints and loosens a stiff upper back.',
      fig: [Object.assign({ t: -90, a1: [55, 75], a2: [125, 105] }, CROSS),
            Object.assign({ t: -90, a1: [65, 75], a2: [115, 105] }, CROSS)]
    },
    {
      id: 'catCow', name: 'Cat-Cow', sk: 'Marjaryasana-Bitilasana', lvl: 'b', pos: 'kneel', use: ['warm'],
      tg: ['spine', 'lowBack', 'neck'], br: 'steady', hold: 45,
      steps: ['Come to hands and knees with wrists under shoulders and knees under hips.',
        'Inhale for Cow: drop your belly, lift your chest and gaze slightly forward.',
        'Exhale for Cat: round your spine up, tucking your chin and tailbone.',
        'Follow the glow. Cow as it grows, Cat as it fades.'],
      tip: 'Fold a blanket under your knees if they feel tender.',
      why: 'Gently moves every segment of the spine and lubricates the lumbar joints.',
      fig: [Object.assign({}, TABLE, { c: 4, hd: -50 }), Object.assign({}, TABLE, { c: -5, hd: 60 })]
    },
    {
      id: 'pelvicTilt', name: 'Pelvic Tilts', lvl: 'b', pos: 'supine', use: ['warm'],
      tg: ['lowBack', 'core'], br: 'steady', hold: 40,
      steps: ['Lie on your back with knees bent and feet flat, hip-width apart.',
        'Inhale and let your low back gently arch away from the floor.',
        'Exhale and draw your belly in, pressing your low back toward the floor.',
        'Keep the movement small, slow and pain-free.'],
      tip: 'Place a hand under your low back to feel the movement.',
      why: 'One of the best everyday exercises for lumbar mobility and deep core control.',
      fig: [Object.assign({}, SUP, { c: 3, a1: [14, 14], a2: [13, 15], l1: [-40, 95, 0], l2: [-38, 97, 0] }),
            Object.assign({}, SUP, { c: -1, a1: [14, 14], a2: [13, 15], l1: [-40, 95, 0], l2: [-38, 97, 0] })]
    },
    {
      id: 'kneesToChest', name: 'Knees-to-Chest', sk: 'Apanasana', lvl: 'b', pos: 'supine', use: ['warm', 'cool'],
      tg: ['lowBack', 'glutes'], br: 'release', hold: 40,
      steps: ['Lie on your back and draw both knees in toward your chest.',
        'Wrap your arms around your shins, or hold behind your thighs.',
        'Let your low back and shoulders soften into the floor.',
        'Optionally rock slowly side to side to massage the low back.'],
      tip: 'Hold behind your thighs instead of your shins if your knees are sensitive.',
      why: 'Gently decompresses the lumbar spine and calms the nervous system.',
      fig: Object.assign({}, SUP, { a1: [-50, -20], a2: [-45, -25], l1: [-115, 0, -70], l2: [-112, 2, -70] })
    },
    {
      id: 'childsPose', name: "Child's Pose", sk: 'Balasana', lvl: 'b', pos: 'kneel', use: ['warm', 'cool'],
      tg: ['lowBack', 'hips', 'shoulders'], br: 'release', hold: 45,
      steps: ['Kneel with big toes touching and knees as wide as your mat.',
        'Sit your hips back toward your heels.',
        'Walk your hands forward and rest your forehead down.',
        'Breathe into the back of your body and let it widen.'],
      tip: 'Place a pillow under your hips or forehead, or keep knees together for a rounder back stretch.',
      why: 'A restful stretch for the low back, hips and shoulders.',
      fig: { t: -4, c: -5, hd: 10, a1: [22, 10], a2: [24, 8], l1: [18, 180, 180], l2: [19, 180, 180] }
    },
    {
      id: 'threadNeedle', name: 'Thread the Needle', lvl: 'b', pos: 'kneel', use: ['warm', 'main'],
      tg: ['shoulders', 'spine', 'neck'], br: 'deepen', hold: 30, sides: true,
      steps: ['Start on hands and knees.',
        'Slide one arm under your body, palm up, along the floor.',
        'Lower that shoulder and the side of your head to the floor.',
        'Keep hips over knees; press the other hand down or reach it forward.'],
      tip: 'Put a pillow under your head if it doesn\'t reach the floor.',
      why: 'Releases the upper back and shoulder blades with a gentle twist.',
      fig: { t: 16, hd: 60, a1: [115, 178], a2: [30, 15], l1: [90, 180, 180], l2: [92, 178, 180] }
    },
    {
      id: 'wipers', name: 'Windshield Wipers', lvl: 'b', pos: 'supine', use: ['warm'],
      tg: ['lowBack', 'hips'], br: 'steady', hold: 40,
      steps: ['Lie on your back with knees bent, feet wider than your hips.',
        'Stretch your arms out in a T, palms down.',
        'Let both knees sway slowly to one side, then the other, with your breath.',
        'Keep both shoulders heavy on the floor.'],
      tip: 'Keep the range small at first and only go as far as feels easy.',
      why: 'Mobilizes the hips and gently rotates the low back.',
      fig: [Object.assign({ top: true, t: -90, l1: [35, 120, 120], l2: [50, 125, 125] }, T_ARMS),
            Object.assign({ top: true, t: -90, l1: [145, 60, 60], l2: [130, 55, 55] }, T_ARMS)]
    },
    {
      id: 'easySeat', name: 'Easy Seat Breathing', sk: 'Sukhasana', lvl: 'b', pos: 'seat', use: ['warm', 'cool'],
      tg: ['spine', 'hips'], br: 'release', hold: 45,
      steps: ['Sit cross-legged, on a cushion if your knees are higher than your hips.',
        'Stack your shoulders over your hips and rest your hands on your knees.',
        'Soften your jaw, face and shoulders.',
        'Follow the glow with slow, quiet breaths.'],
      tip: 'Sit with your back against a wall for support.',
      why: 'Settles the mind and builds posture awareness.',
      fig: Object.assign({ t: -90, a1: [65, 75], a2: [115, 105] }, CROSS)
    },
    {
      id: 'seatedSideBend', name: 'Seated Side Bend', sk: 'Parsva Sukhasana', lvl: 'b', pos: 'seat', use: ['warm', 'main'],
      tg: ['sideBody', 'shoulders'], br: 'deepen', hold: 25, sides: true,
      steps: ['Sit cross-legged and place one hand on the floor beside you.',
        'Inhale and sweep the other arm up.',
        'Exhale and arc it overhead toward the grounded hand.',
        'Keep both sit bones heavy on the floor.'],
      tip: 'Bend your elbow and place the hand on your head for a gentler version.',
      why: 'Lengthens the side waist and the quadratus lumborum, a key low-back muscle.',
      fig: Object.assign({ t: -72, c: -4, hd: -55, a1: [70, 85], a2: [-100, -35] }, CROSS)
    },

    // ───────────── Standing ─────────────
    {
      id: 'downDog', name: 'Downward-Facing Dog', sk: 'Adho Mukha Svanasana', lvl: 'b', pos: 'kneel', use: ['main'],
      tg: ['hamstrings', 'calves', 'shoulders', 'spine'], br: 'deepen', hold: 30,
      steps: ['From hands and knees, tuck your toes and lift your hips up and back.',
        'Press firmly through spread fingers and lengthen your spine.',
        'Bend your knees as much as you need to keep your back long.',
        'Let your heels sink toward the floor. They don\'t need to touch.'],
      tip: 'Keep knees generously bent and focus on a long spine rather than straight legs.',
      why: 'Stretches hamstrings, calves and shoulders while lengthening the whole spine.',
      fig: { t: 40, hd: 80, a1: [40, 40], a2: [39, 41], l1: [125, 125, 0], l2: [123, 127, 0] }
    },
    {
      id: 'lowLunge', name: 'Low Lunge', sk: 'Anjaneyasana', lvl: 'b', pos: 'kneel', use: ['main'],
      tg: ['hips', 'quads'], br: 'deepen', hold: 30, sides: true,
      steps: ['Step one foot forward between your hands, knee over ankle.',
        'Lower the back knee to the floor (pad it with a blanket).',
        'Lift your torso and let your hips sink gently forward.',
        'Reach your arms overhead if it feels steady.'],
      tip: 'Keep your hands on your front thigh or on blocks for balance.',
      why: 'Opens tight hip flexors, which often pull on the low back after long sitting.',
      fig: { t: -92, c: 2, hd: -95, a1: [-95, -93], a2: [-88, -86], l1: [3, 88, 0], l2: [108, 180, 180] }
    },
    {
      id: 'highLunge', name: 'High Lunge', lvl: 'i', pos: 'stand', use: ['main'],
      tg: ['hips', 'quads', 'balance'], br: 'steady', hold: 30, sides: true,
      steps: ['Step one foot back into a long stance, staying on the ball of the back foot.',
        'Bend your front knee over your ankle and keep the back leg strong.',
        'Reach your arms up beside your ears.',
        'Draw your lower belly in so your low back stays long.'],
      tip: 'Lower the back knee to the floor if balance is wobbly.',
      why: 'Builds leg strength while stretching the hip flexor of the back leg.',
      fig: { t: -90, a1: [-95, -92], a2: [-88, -86], l1: [20, 90, 0], l2: [148, 148, 120] }
    },
    {
      id: 'warrior1', name: 'Warrior I', sk: 'Virabhadrasana I', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['hips', 'quads', 'shoulders'], br: 'steady', hold: 30, sides: true,
      steps: ['Step one foot back about 3–4 feet and turn the back foot out 45°, heel down.',
        'Bend your front knee over the ankle.',
        'Turn your hips toward the front of the mat.',
        'Reach your arms overhead and lift through your chest.'],
      tip: 'Shorten your stance or widen your feet side to side for more stability.',
      why: 'Strengthens the legs and stretches the hip flexors and shoulders.',
      fig: { t: -90, hd: -95, a1: [-95, -92], a2: [-88, -86], l1: [20, 90, 0], l2: [138, 138, 0] }
    },
    {
      id: 'warrior2', name: 'Warrior II', sk: 'Virabhadrasana II', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['hips', 'quads', 'shoulders'], br: 'steady', hold: 30, sides: true,
      steps: ['Stand with feet wide. Turn your front foot out and the back foot slightly in.',
        'Bend your front knee directly over your ankle.',
        'Extend your arms long at shoulder height.',
        'Gaze softly over your front fingertips.'],
      tip: 'Keep the front knee tracking toward your middle toes, not collapsing inward.',
      why: 'Opens the inner hips and builds stamina in the legs.',
      fig: Object.assign({ t: -90, a1: [0, 0], a2: [180, 180] }, W2_LEGS)
    },
    {
      id: 'triangle', name: 'Triangle Pose', sk: 'Trikonasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['hamstrings', 'sideBody', 'hips'], br: 'deepen', hold: 30, sides: true,
      steps: ['From a wide stance, turn your front foot out.',
        'Reach forward over the front leg, then tilt your torso down.',
        'Rest your lower hand on your shin or a block and reach the top arm up.',
        'Keep both legs straight but not locked.'],
      tip: 'Rest your hand higher on your leg to keep both sides of your waist long.',
      why: 'Stretches the hamstrings and side body while strengthening the legs.',
      fig: { t: -10, hd: -30, a1: [95, 95], a2: [-85, -85], l1: [45, 45, 0], l2: [135, 135, 180] }
    },
    {
      id: 'sideAngle', name: 'Extended Side Angle', sk: 'Utthita Parsvakonasana', lvl: 'i', pos: 'stand', use: ['main'],
      tg: ['sideBody', 'hips', 'quads'], br: 'deepen', hold: 30, sides: true,
      steps: ['From Warrior II, rest your front forearm on your front thigh.',
        'Reach the top arm overhead so it lines up with the back leg.',
        'Turn your chest open toward the ceiling.',
        'Press firmly into the outer edge of the back foot.'],
      tip: 'For more depth, place your hand on a block or the floor outside the front foot.',
      why: 'Creates one long line of stretch from the back heel to the fingertips.',
      fig: Object.assign({ t: -25, hd: -45, a1: [105, 185], a2: [-38, -38] }, W2_LEGS)
    },
    {
      id: 'pyramid', name: 'Pyramid Pose', sk: 'Parsvottanasana', lvl: 'i', pos: 'stand', use: ['main'],
      tg: ['hamstrings', 'calves', 'hips'], br: 'deepen', hold: 30, sides: true,
      steps: ['Step one foot back about 3 feet with both feet facing mostly forward.',
        'Square your hips and place your hands on your hips or on blocks.',
        'Inhale to lengthen your spine.',
        'Exhale and hinge forward over the front leg with a flat back.'],
      tip: 'Keep a micro-bend in the front knee to protect the back of the knee.',
      why: 'An intense hamstring stretch that also trains a neutral, supported spine.',
      fig: { t: 35, hd: 75, a1: [212, 225], a2: [218, 222], l1: [62, 62, 0], l2: [118, 118, 0] }
    },
    {
      id: 'wideFold', name: 'Wide-Legged Forward Fold', sk: 'Prasarita Padottanasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['hamstrings', 'hips', 'lowBack'], br: 'deepen', hold: 35,
      steps: ['Stand with your feet wide apart, toes turned slightly in.',
        'Place your hands on your hips and inhale to lengthen.',
        'Exhale and hinge forward from your hips, bringing hands to the floor or blocks.',
        'Let your head hang heavy.'],
      tip: 'Bend your knees to protect your low back, and rise slowly with hands on hips.',
      why: 'Releases the hamstrings and inner legs and lets the spine hang freely.',
      fig: { t: 90, tl: 0.7, hd: 90, a1: [25, 110], a2: [155, 70], l1: [58, 58, 0], l2: [122, 122, 180] }
    },
    {
      id: 'chair', name: 'Chair Pose', sk: 'Utkatasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['quads', 'glutes', 'core'], br: 'steady', hold: 25,
      steps: ['Stand with feet together or hip-width apart.',
        'Bend your knees and sit your hips back as if into a chair.',
        'Reach your arms up alongside your ears.',
        'Keep weight in your heels and draw your belly in to support your low back.'],
      tip: 'Keep your hands at your heart and sit back less deeply.',
      why: 'Strengthens the legs and glutes that support your lower back.',
      fig: { t: -65, hd: -70, a1: [-70, -70], a2: [-68, -72], l1: [25, 115, 0], l2: [26, 114, 0] }
    },
    {
      id: 'tree', name: 'Tree Pose', sk: 'Vrksasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['balance', 'hips'], br: 'balance', hold: 30, sides: true,
      steps: ['Stand on one leg and place the other foot on your inner calf or thigh, never on the knee.',
        'Press your foot and standing leg gently into each other.',
        'Bring your hands to your heart or reach them overhead.',
        'Gaze at one still point in front of you.'],
      tip: 'Keep the toes of the lifted foot on the floor like a kickstand, or hold a wall.',
      why: 'Improves balance and opens the hip of the lifted leg.',
      fig: { t: -90, a1: [-40, -125], a2: [-140, -55], l1: [30, 160, 95], l2: [92, 90, 180] }
    },
    {
      id: 'quadStretch', name: 'Standing Quad Stretch', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['quads', 'hips', 'balance'], br: 'steady', hold: 30, sides: true,
      steps: ['Stand tall and bend one knee, holding that ankle behind you.',
        'Bring your knees side by side.',
        'Gently tuck your tailbone to feel the front of the hip open.',
        'Hold a wall or reach the other arm forward for balance.'],
      tip: 'Loop a towel around your foot if you can\'t reach it.',
      why: 'Stretches the quads and hip flexors that can tug on the low back.',
      fig: { t: -90, a1: [110, 105], a2: [20, 10], l1: [100, -110, 160], l2: [90, 90, 0] }
    },
    {
      id: 'dancer', name: "Dancer's Pose", sk: 'Natarajasana', lvl: 'i', pos: 'stand', use: ['main'],
      tg: ['quads', 'chest', 'balance', 'shoulders'], br: 'balance', hold: 25, sides: true,
      steps: ['Stand on one leg and hold the inside of the other ankle behind you.',
        'Reach your free arm forward.',
        'Kick your foot into your hand as your chest tips forward.',
        'Lift the leg higher only as your balance allows.'],
      tip: 'Stand near a wall and touch it with the forward hand.',
      why: 'Opens the chest, shoulders and front of the hip while training balance.',
      fig: { t: -55, hd: -45, a1: [195, 210], a2: [-40, -40], l1: [215, -70, 250], l2: [90, 90, 0] }
    },
    {
      id: 'garland', name: 'Garland Pose', sk: 'Malasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['hips', 'lowBack', 'calves'], br: 'deepen', hold: 30,
      steps: ['Stand with feet wider than your hips, toes turned out.',
        'Squat down, keeping your heels down or on a rolled blanket.',
        'Bring your palms together and press your elbows into your inner knees.',
        'Lengthen up through the crown of your head.'],
      tip: 'Sit on a block or thick book to make this a resting pose.',
      why: 'Opens the hips and groin and gently lengthens the low back.',
      fig: { t: -80, a1: [70, -110], a2: [60, -100], l1: [-10, 125, 0], l2: [-8, 127, 0] }
    },
    {
      id: 'forwardFold', name: 'Standing Forward Fold', sk: 'Uttanasana', lvl: 'b', pos: 'stand', use: ['warm', 'main'],
      tg: ['hamstrings', 'lowBack', 'calves'], br: 'deepen', hold: 30,
      steps: ['Stand with feet hip-width apart and hinge forward from your hips.',
        'Bend your knees generously and let your torso hang.',
        'Hold opposite elbows, or rest your hands on your shins.',
        'Gently nod and shake your head to release your neck.'],
      tip: 'Roll up slowly, one vertebra at a time, with knees bent.',
      why: 'Lengthens the back of the legs and decompresses the spine.',
      fig: { t: 60, c: -3, hd: 85, a1: [90, 175], a2: [92, 172], l1: [80, 80, 0], l2: [82, 82, 0] }
    },
    {
      id: 'chestOpener', name: 'Standing Chest Opener', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['chest', 'shoulders'], br: 'deepen', hold: 30,
      steps: ['Stand tall and interlace your fingers behind your low back.',
        'Straighten your arms and draw your shoulder blades together.',
        'Lift your chest and reach your knuckles down and back.',
        'Keep your chin level and neck long.'],
      tip: 'Hold a towel between your hands if they don\'t meet.',
      why: 'Counteracts slouching by opening the chest and fronts of the shoulders.',
      fig: { t: -95, c: 2, hd: -100, a1: [125, 125], a2: [123, 127], l1: [90, 90, 0], l2: [89, 91, 0] }
    },
    {
      id: 'halfMoon', name: 'Half Moon', sk: 'Ardha Chandrasana', lvl: 'i', pos: 'stand', use: ['main'],
      tg: ['balance', 'hamstrings', 'hips', 'core'], br: 'balance', hold: 25, sides: true,
      steps: ['From Triangle, bend your front knee and place your hand about a foot ahead, on the floor or a block.',
        'Lift the back leg to hip height as you straighten the front leg.',
        'Stack your hips and reach your top arm to the ceiling.',
        'Flex the lifted foot and keep it strong.'],
      tip: 'Use a block under your hand and keep your back near a wall.',
      why: 'Builds balance, core strength and length through the standing hamstring.',
      fig: { t: 28, hd: 10, a1: [90, 90], a2: [-85, -90], l1: [85, 85, 0], l2: [208, 208, 118] }
    },
    {
      id: 'reverseWarrior', name: 'Reverse Warrior', sk: 'Viparita Virabhadrasana', lvl: 'b', pos: 'stand', use: ['main'],
      tg: ['sideBody', 'hips', 'quads'], br: 'steady', hold: 25, sides: true,
      steps: ['Start in Warrior II, keeping the front knee bent.',
        'Slide your back hand down the back leg.',
        'Reach your front arm up and over toward the back of the mat.',
        'Breathe into the long side of your waist.'],
      tip: 'Rest your back hand on your hip instead of your leg.',
      why: 'Stretches the side body and hip flexors while the legs stay strong.',
      fig: Object.assign({ t: -110, c: 3, hd: -120, a1: [-115, -130], a2: [130, 115] }, W2_LEGS)
    },

    // ───────────── Kneeling ─────────────
    {
      id: 'lizard', name: 'Lizard Pose', sk: 'Utthan Pristhasana', lvl: 'i', pos: 'kneel', use: ['main'],
      tg: ['hips', 'quads', 'hamstrings'], br: 'deepen', hold: 40, sides: true,
      steps: ['From Low Lunge, step your front foot to the outer edge of the mat.',
        'Bring both hands, or both forearms, down inside the front foot.',
        'Keep the back knee down or lift it for more intensity.',
        'Let your hips sink slowly with each exhale.'],
      tip: 'Stay up on your hands or place your forearms on a block.',
      why: 'A deep opener for the hip flexors, groin and outer hip.',
      fig: { t: 14, hd: 20, a1: [90, 0], a2: [91, 2], l1: [0, 90, 0], l2: [108, 180, 180] }
    },
    {
      id: 'halfSplits', name: 'Half Splits', sk: 'Ardha Hanumanasana', lvl: 'b', pos: 'kneel', use: ['main'],
      tg: ['hamstrings', 'calves'], br: 'deepen', hold: 35, sides: true,
      steps: ['From Low Lunge, shift your hips back over the back knee.',
        'Straighten the front leg and flex your toes up.',
        'Hinge forward with a long spine.',
        'Rest your hands on blocks or the floor beside the front leg.'],
      tip: 'Keep a small bend in the front knee if the stretch is sharp.',
      why: 'Isolates the hamstrings, which often pull on the low back when tight.',
      fig: { t: 20, hd: 40, a1: [55, 5], a2: [57, 7], l1: [31, 31, -60], l2: [90, 180, 180] }
    },
    {
      id: 'gate', name: 'Gate Pose', sk: 'Parighasana', lvl: 'b', pos: 'kneel', use: ['main'],
      tg: ['sideBody', 'hamstrings', 'hips'], br: 'deepen', hold: 30, sides: true,
      steps: ['Kneel and extend one leg out to the side with the foot flat.',
        'Rest that hand on your extended leg.',
        'Sweep the other arm up and over, bending toward the extended leg.',
        'Keep your chest facing forward.'],
      tip: 'Pad the kneeling knee with a blanket.',
      why: 'Opens the side body and inner thigh at the same time.',
      fig: { t: -30, c: -3, hd: -35, a1: [90, 92], a2: [-60, -20], l1: [36, 36, 0], l2: [90, 90, 180, 0.15] }
    },
    {
      id: 'camel', name: 'Camel Pose', sk: 'Ustrasana', lvl: 'i', pos: 'kneel', use: ['main'],
      tg: ['chest', 'hips', 'quads', 'spine'], br: 'deepen', hold: 20,
      steps: ['Kneel with knees hip-width apart and hips stacked over your knees.',
        'Place your hands on your low back, fingers pointing down.',
        'Lift your chest up first, then gently lean back as your hips press forward.',
        'Reach for your heels only if your low back feels great. Keep your neck long.'],
      tip: 'Tuck your toes to bring your heels closer. Come up slowly, leading with your chest.',
      why: 'A strong opener for the chest and hip flexors that builds back strength.',
      fig: { t: -125, c: 6, hd: -170, a1: [80, 30], a2: [82, 28], l1: [80, 180, 180], l2: [81, 180, 180] }
    },
    {
      id: 'puppy', name: 'Puppy Pose', sk: 'Uttana Shishosana', lvl: 'b', pos: 'kneel', use: ['main'],
      tg: ['shoulders', 'chest', 'spine'], br: 'deepen', hold: 35,
      steps: ['From hands and knees, keep your hips stacked over your knees.',
        'Walk your hands forward and let your chest melt toward the floor.',
        'Rest your forehead down.',
        'Keep your arms active, with elbows lifted off the floor.'],
      tip: 'Slide a pillow under your chest for support.',
      why: 'Opens the shoulders and upper back, a cousin of Child\'s Pose and Down Dog.',
      fig: { t: 28, c: 4, hd: 10, a1: [20, 15], a2: [22, 13], l1: [90, 180, 180], l2: [91, 179, 180] }
    },
    {
      id: 'birdDog', name: 'Bird Dog', lvl: 'b', pos: 'kneel', use: ['warm', 'main'],
      tg: ['core', 'lowBack', 'glutes', 'balance'], br: 'steady', hold: 30, sides: true,
      steps: ['Start on hands and knees with a neutral spine.',
        'Reach one arm forward and the opposite leg back, both at hip height.',
        'Keep your hips level and belly gently drawn in.',
        'Hold steady and breathe slowly.'],
      tip: 'Lift just the arm or just the leg first, then combine them.',
      why: 'Builds the deep core and back muscles that stabilize the lumbar spine.',
      fig: Object.assign({}, TABLE, { a1: [-8, -8], l1: [180, 180, 90] })
    },
    {
      id: 'pigeon', name: 'Pigeon Pose', sk: 'Eka Pada Rajakapotasana', lvl: 'i', pos: 'kneel', use: ['main'],
      tg: ['hips', 'glutes', 'lowBack'], br: 'deepen', hold: 45, sides: true,
      steps: ['From hands and knees, bring one knee forward behind its wrist with the shin angled.',
        'Slide the back leg straight behind you.',
        'Square your hips, with a cushion under the front hip if it floats.',
        'Stay upright on your hands, or fold forward over the front shin.'],
      tip: 'Never push through knee pain. Choose Reclined Figure Four instead.',
      why: 'One of the deepest stretches for the outer hip and glutes.',
      fig: { t: -85, a1: [95, 95], a2: [93, 97], l1: [15, 180, 180, 0.7], l2: [172, 172, 180] }
    },

    // ───────────── Seated ─────────────
    {
      id: 'eagleArms', name: 'Eagle Arms', sk: 'Garudasana arms', lvl: 'b', pos: 'seat', use: ['warm', 'main'],
      tg: ['shoulders', 'neck'], br: 'deepen', hold: 30, sides: true,
      steps: ['Sit tall and reach your arms forward.',
        'Cross one arm under the other at the elbows.',
        'Bend your elbows and bring your palms, or the backs of your hands, together.',
        'Lift your elbows to shoulder height and move your hands away from your face.'],
      tip: 'Simply hug your shoulders if your palms don\'t meet.',
      why: 'Stretches between the shoulder blades, where tension tends to collect.',
      fig: Object.assign({ t: -90, a1: [5, -85], a2: [10, -80] }, SIDE_SEAT)
    },
    {
      id: 'cowFaceArms', name: 'Cow Face Arms', sk: 'Gomukhasana arms', lvl: 'i', pos: 'seat', use: ['main'],
      tg: ['shoulders', 'chest'], br: 'deepen', hold: 30, sides: true,
      steps: ['Sit tall and reach one arm up, then bend it so the hand drops between your shoulder blades.',
        'Reach the other arm down and bend it up behind your back.',
        'Clasp your fingers, or hold a towel between your hands.',
        'Keep your head tall rather than pushed forward by the top arm.'],
      tip: 'Use a towel or strap and walk your hands toward each other.',
      why: 'Improves shoulder rotation in both directions.',
      fig: Object.assign({ t: -90, a1: [-100, 100], a2: [110, -100] }, SIDE_SEAT)
    },
    {
      id: 'seatedFold', name: 'Seated Forward Fold', sk: 'Paschimottanasana', lvl: 'b', pos: 'seat', use: ['main', 'cool'],
      tg: ['hamstrings', 'lowBack', 'calves'], br: 'deepen', hold: 40,
      steps: ['Sit with your legs extended and feet flexed.',
        'Inhale and lengthen your spine.',
        'Exhale and hinge from your hips, reaching toward your shins or feet.',
        'Bend your knees as needed and let your back round gently.'],
      tip: 'Sit on a folded blanket to tilt your pelvis forward.',
      why: 'Stretches the entire back line, from heels to the base of the skull.',
      fig: { t: -30, c: -3, hd: -10, a1: [30, 25], a2: [32, 23], l1: [5, 5, -85], l2: [6, 6, -85] }
    },
    {
      id: 'headToKnee', name: 'Head-to-Knee Pose', sk: 'Janu Sirsasana', lvl: 'b', pos: 'seat', use: ['main', 'cool'],
      tg: ['hamstrings', 'lowBack', 'sideBody'], br: 'deepen', hold: 35, sides: true,
      steps: ['Sit with one leg extended and the other foot against your inner thigh.',
        'Turn your chest toward the extended leg.',
        'Inhale to lengthen, then exhale and fold forward.',
        'Hold your shin, ankle or foot.'],
      tip: 'Loop a towel around the extended foot.',
      why: 'Stretches one hamstring at a time and gently rotates the spine.',
      fig: { t: -25, c: -4, hd: 0, a1: [30, 20], a2: [32, 18], l1: [5, 5, -85], l2: [8, 185, 180, 0.8] }
    },
    {
      id: 'butterfly', name: 'Butterfly Pose', sk: 'Baddha Konasana', lvl: 'b', pos: 'seat', use: ['main', 'cool'],
      tg: ['hips', 'lowBack'], br: 'release', hold: 40,
      steps: ['Sit and bring the soles of your feet together, knees falling open.',
        'Hold your feet or ankles and sit tall.',
        'Let your knees relax down. Don\'t press them.',
        'Fold forward gently if you\'d like more.'],
      tip: 'Place cushions under your knees and move your feet farther away.',
      why: 'Opens the inner thighs and hips with very little strain.',
      fig: { t: -90, tl: 0.85, a1: [60, 110], a2: [120, 70], l1: [15, 172, 170], l2: [165, 8, 10] }
    },
    {
      id: 'wideSeated', name: 'Wide-Angle Seated Fold', sk: 'Upavistha Konasana', lvl: 'i', pos: 'seat', use: ['main'],
      tg: ['hamstrings', 'hips', 'lowBack'], br: 'deepen', hold: 40,
      steps: ['Sit with your legs wide, kneecaps and toes pointing up.',
        'Place your hands on the floor in front of you.',
        'Walk your hands forward, keeping your spine long.',
        'Fold from your hips, not your waist.'],
      tip: 'Sit on a cushion and bend your knees slightly.',
      why: 'Stretches the hamstrings and inner thighs together.',
      fig: { t: -90, tl: 0.6, a1: [55, 30], a2: [125, 150], l1: [8, 8, -80], l2: [172, 172, -100] }
    },
    {
      id: 'seatedTwist', name: 'Seated Spinal Twist', sk: 'Ardha Matsyendrasana', lvl: 'b', pos: 'seat', use: ['main', 'cool'],
      tg: ['spine', 'lowBack', 'glutes'], br: 'deepen', hold: 30, sides: true,
      steps: ['Sit with legs extended. Bend one knee and place that foot outside the opposite thigh.',
        'Place the hand on the bent-knee side behind you on the floor.',
        'Hug the knee with your other arm.',
        'Inhale to sit taller; exhale to twist a little more.'],
      tip: 'Keep the bottom leg straight instead of folded.',
      why: 'Rotates the spine and stretches the outer hip and glutes.',
      fig: { t: -90, a1: [110, 100], a2: [10, 60], l1: [-45, 100, 0], l2: [7, 7, -85] }
    },
    {
      id: 'fireLog', name: 'Fire Log Pose', sk: 'Agnistambhasana', lvl: 'i', pos: 'seat', use: ['main'],
      tg: ['hips', 'glutes'], br: 'deepen', hold: 40, sides: true,
      steps: ['Sit and stack your shins parallel to the front of the mat, ankle over the opposite knee.',
        'Flex both feet to protect your knees.',
        'Sit tall and breathe.',
        'Fold forward over your shins for more intensity.'],
      tip: 'Place a cushion under the top knee, or use a simple cross-legged seat.',
      why: 'A strong outer-hip stretch that can ease sciatic tension.',
      fig: { t: -90, tl: 0.9, a1: [70, 90], a2: [110, 90], l1: [30, 183, 180], l2: [150, -3, 0] }
    },
    {
      id: 'boat', name: 'Boat Pose', sk: 'Navasana', lvl: 'i', pos: 'seat', use: ['main'],
      tg: ['core', 'hips'], br: 'balance', hold: 20,
      steps: ['Sit with knees bent and feet on the floor.',
        'Lean back with a straight spine and lift your feet.',
        'Bring your shins parallel to the floor and reach your arms forward.',
        'Straighten your legs only if your back stays long.'],
      tip: 'Hold the backs of your thighs and keep your toes on the floor.',
      why: 'A strong core builds natural support for the lumbar spine.',
      fig: { t: -115, hd: -100, a1: [0, 0], a2: [2, -2], l1: [-50, 0, -80], l2: [-48, 2, -80] }
    },

    // ───────────── On the belly ─────────────
    {
      id: 'plank', name: 'Forearm Plank', lvl: 'i', pos: 'prone', use: ['main'],
      tg: ['core', 'shoulders', 'lowBack'], br: 'steady', hold: 25,
      steps: ['Place your forearms down with elbows under your shoulders.',
        'Step your feet back so your body forms one long line.',
        'Press the floor away and draw your belly in.',
        'Gently squeeze your glutes. Don\'t let your hips sag.'],
      tip: 'Lower your knees to the floor and keep the same long line from knees to head.',
      why: 'Trains the whole core to brace and protect the low back.',
      fig: { t: -6, hd: -6, a1: [90, 0], a2: [91, 1], l1: [172, 172, 100], l2: [173, 171, 100] }
    },
    {
      id: 'sphinx', name: 'Sphinx Pose', sk: 'Salamba Bhujangasana', lvl: 'b', pos: 'prone', use: ['main'],
      tg: ['lowBack', 'spine', 'chest'], br: 'deepen', hold: 40,
      steps: ['Lie on your belly with elbows under your shoulders and forearms parallel.',
        'Press your forearms down and lift your chest.',
        'Slide your shoulders back and away from your ears.',
        'Let your legs relax with the tops of your feet down.'],
      tip: 'Move your elbows farther forward for a softer arch.',
      why: 'A gentle backbend that restores the natural curve of the low back.',
      fig: Object.assign({ t: -34, c: 4, hd: -10, a1: [90, 0], a2: [91, 1] }, PRONE_LEGS)
    },
    {
      id: 'cobra', name: 'Cobra Pose', sk: 'Bhujangasana', lvl: 'b', pos: 'prone', use: ['main'],
      tg: ['lowBack', 'chest', 'spine'], br: 'steady', hold: 25,
      steps: ['Lie on your belly with hands beside your ribs and elbows hugging in.',
        'Press the tops of your feet into the floor.',
        'Inhale and lift your chest, mostly with your back muscles.',
        'Keep your shoulders down and your neck long.'],
      tip: 'Try "baby cobra": lift just a few inches with almost no weight in your hands.',
      why: 'Strengthens the back extensors that hold you upright.',
      fig: Object.assign({ t: -40, c: 5, hd: -45, a1: [140, 40], a2: [142, 38] }, PRONE_LEGS)
    },
    {
      id: 'upDog', name: 'Upward-Facing Dog', sk: 'Urdhva Mukha Svanasana', lvl: 'i', pos: 'prone', use: ['main'],
      tg: ['chest', 'spine', 'shoulders'], br: 'steady', hold: 20,
      steps: ['Lie on your belly with hands beside your low ribs.',
        'Press down and straighten your arms, lifting your thighs off the floor.',
        'Press the tops of your feet down.',
        'Roll your shoulders back and draw your chest forward.'],
      tip: 'Keep thighs down and arms slightly bent (that\'s Cobra) if your low back pinches.',
      why: 'Opens the whole front body and strengthens arms and back.',
      fig: { t: -55, c: 5, hd: -60, a1: [88, 88], a2: [87, 89], l1: [170, 170, 180], l2: [171, 169, 180] }
    },
    {
      id: 'locust', name: 'Locust Pose', sk: 'Salabhasana', lvl: 'b', pos: 'prone', use: ['main'],
      tg: ['lowBack', 'glutes', 'core'], br: 'steady', hold: 20,
      steps: ['Lie on your belly with arms by your sides, palms down.',
        'Inhale and lift your chest, arms and legs.',
        'Gaze down to keep your neck long.',
        'Gently squeeze your glutes and reach back through your toes.'],
      tip: 'Lift only your chest, or only your legs, at first.',
      why: 'Directly strengthens the muscles that support the lower back.',
      fig: { t: -24, c: 3, hd: -28, a1: [172, 170], a2: [173, 169], l1: [196, 190, 180], l2: [194, 188, 180] }
    },
    {
      id: 'bow', name: 'Bow Pose', sk: 'Dhanurasana', lvl: 'i', pos: 'prone', use: ['main'],
      tg: ['chest', 'quads', 'spine', 'shoulders'], br: 'steady', hold: 20,
      steps: ['Lie on your belly, bend your knees and hold the outsides of your ankles.',
        'Inhale and kick your feet into your hands.',
        'Let that lift your chest and thighs.',
        'Keep your knees no wider than your hips.'],
      tip: 'Hold one ankle at a time (half bow) or use a strap.',
      why: 'Opens the chest, shoulders and fronts of the hips in one shape.',
      fig: { t: -50, c: 5, hd: -60, a1: [192, 200], a2: [194, 198], l1: [205, -60, 200], l2: [203, -62, 200] }
    },

    // ───────────── On the back ─────────────
    {
      id: 'bridge', name: 'Bridge Pose', sk: 'Setu Bandha Sarvangasana', lvl: 'b', pos: 'supine', use: ['main'],
      tg: ['glutes', 'lowBack', 'chest', 'quads'], br: 'steady', hold: 30,
      steps: ['Lie on your back with knees bent and feet flat, close to your hips.',
        'Rest your arms by your sides.',
        'Press into your feet and lift your hips.',
        'Keep your knees hip-width, then lower slowly, one vertebra at a time.'],
      tip: 'Slide a block or firm pillow under your sacrum for a supported version.',
      why: 'Strengthens the glutes and back muscles, a powerful pair for lumbar support.',
      fig: { t: 150, hd: 180, a1: [17, 17], a2: [16, 18], l1: [0, 90, 0], l2: [2, 92, 0] }
    },
    {
      id: 'deadBug', name: 'Dead Bug', lvl: 'b', pos: 'supine', use: ['main'],
      tg: ['core', 'lowBack'], br: 'steady', hold: 40,
      steps: ['Lie on your back with arms toward the ceiling and knees over hips, bent 90°.',
        'Press your low back gently into the floor.',
        'Inhale and extend one arm overhead and the opposite leg out.',
        'Exhale to return, then switch sides. Slow is better than fast.'],
      tip: 'Tap your heel to the floor instead of straightening the leg fully.',
      why: 'Teaches your core to keep the lumbar spine stable while limbs move.',
      fig: [Object.assign({}, SUP, { a1: [-170, -175], a2: [-90, -90], l1: [-90, 0, -90], l2: [-8, -8, -80] }),
            Object.assign({}, SUP, { a1: [-90, -90], a2: [-88, -92], l1: [-90, 0, -90], l2: [-88, 2, -90] })]
    },
    {
      id: 'supineTwist', name: 'Supine Spinal Twist', sk: 'Supta Matsyendrasana', lvl: 'b', pos: 'supine', use: ['main', 'cool'],
      tg: ['lowBack', 'spine', 'glutes', 'chest'], br: 'release', hold: 45, sides: true,
      steps: ['Lie on your back and hug your knees in.',
        'Open your arms out to a T.',
        'Let both knees drop to one side and turn your head the other way.',
        'Let both shoulders stay heavy.'],
      tip: 'Place a pillow between or under your knees.',
      why: 'Releases the low back and spine. A favorite way to finish.',
      fig: Object.assign({ top: true, t: -90, hd: -110, l1: [-20, 70, 70], l2: [-10, 75, 75] }, T_ARMS)
    },
    {
      id: 'figureFour', name: 'Reclined Figure Four', sk: 'Supta Kapotasana', lvl: 'b', pos: 'supine', use: ['main', 'cool'],
      tg: ['hips', 'glutes', 'lowBack'], br: 'deepen', hold: 40, sides: true,
      steps: ['Lie on your back with knees bent.',
        'Cross one ankle over the opposite thigh and flex that foot.',
        'Thread your hands behind the lower thigh and draw both legs in.',
        'Keep your head and shoulders relaxed on the floor.'],
      tip: 'Keep the bottom foot on the floor for a gentler stretch.',
      why: 'A knee-friendly way to stretch the outer hip and glutes.',
      fig: Object.assign({}, SUP, { a1: [-30, -50], a2: [-35, -45], l1: [-30, 195, -100], l2: [-110, 0, -70] })
    },
    {
      id: 'happyBaby', name: 'Happy Baby', sk: 'Ananda Balasana', lvl: 'b', pos: 'supine', use: ['main', 'cool'],
      tg: ['hips', 'lowBack', 'hamstrings'], br: 'release', hold: 40,
      steps: ['Lie on your back and draw your knees toward your armpits.',
        'Hold the outsides of your feet, your ankles or your shins.',
        'Stack your ankles over your knees, knees wide.',
        'Rock gently side to side if it feels good.'],
      tip: 'Hold behind your thighs or do one leg at a time.',
      why: 'Releases the low back and inner hips while you rest.',
      fig: Object.assign({}, SUP, { a1: [-70, -75], a2: [-72, -73], l1: [-140, -90, 0], l2: [-138, -92, 0] })
    },
    {
      id: 'handToToe', name: 'Reclined Hand-to-Big-Toe', sk: 'Supta Padangusthasana', lvl: 'b', pos: 'supine', use: ['main', 'cool'],
      tg: ['hamstrings', 'calves', 'hips'], br: 'deepen', hold: 40, sides: true,
      steps: ['Lie on your back and loop a strap or towel around one foot.',
        'Extend that leg toward the ceiling.',
        'Keep the other leg long on the floor, or bent with the foot down.',
        'Keep both hips grounded and shoulders relaxed.'],
      tip: 'Bend the lifted knee slightly. The stretch should be in the belly of the muscle.',
      why: 'The safest way to stretch hamstrings because the low back stays supported.',
      fig: Object.assign({}, SUP, { strap: true, a1: [-50, -60], a2: [14, 14], l1: [-100, -100, 180], l2: [8, 8, -80] })
    },
    {
      id: 'fish', name: 'Fish Pose', sk: 'Matsyasana', lvl: 'i', pos: 'supine', use: ['main'],
      tg: ['chest', 'shoulders', 'neck'], br: 'deepen', hold: 25,
      steps: ['Lie on your back and slide your hands under your hips, palms down.',
        'Press your forearms down and lift your chest.',
        'Lightly rest the crown of your head down, keeping most weight in your forearms.',
        'Come out by lifting your head first, then lowering your back.'],
      tip: 'Lie back over a pillow or block under your upper back instead.',
      why: 'Opens the chest and throat. A natural counter to hunching.',
      fig: { t: -160, c: 5, hd: 120, a1: [80, 0], a2: [81, 1], l1: [7, 7, -80], l2: [8, 6, -80] }
    },

    // ───────────── Advanced: unlock 2 every 7 practice days, in `unlock` order ─────────────
    {
      id: 'sidePlank', name: 'Side Plank', sk: 'Vasisthasana', lvl: 'a', unlock: 1, pos: 'prone', use: ['main'],
      tg: ['core', 'shoulders', 'sideBody'], br: 'steady', hold: 20, sides: true,
      steps: ['From plank, shift onto the outer edge of one foot and stack the other on top.',
        'Plant the bottom hand under your shoulder and press the floor away.',
        'Lift your hips so your body forms one long line.',
        'Reach the top arm to the ceiling and breathe steadily.'],
      tip: 'Lower the bottom knee to the floor for a kneeling side plank.',
      why: 'Builds the side-core muscles that keep the low back stable.',
      fig: { t: -24, hd: -24, a1: [90, 90], a2: [-92, -90], l1: [156, 156, 180], l2: [155, 157, 180] }
    },
    {
      id: 'warrior3', name: 'Warrior III', sk: 'Virabhadrasana III', lvl: 'a', unlock: 2, pos: 'stand', use: ['main'],
      tg: ['balance', 'glutes', 'hamstrings', 'core'], br: 'balance', hold: 20, sides: true,
      steps: ['Stand on one leg with a soft knee.',
        'Hinge forward as the other leg lifts behind you, until body and leg are parallel to the floor.',
        'Reach your arms forward, or keep hands at your heart.',
        'Keep your hips level and press out through the lifted heel.'],
      tip: 'Rest your fingertips on blocks or a chair under your shoulders.',
      why: 'Strengthens the glutes and back of the body as one unit, great for lumbar support.',
      fig: { t: 0, hd: 0, a1: [0, 0], a2: [2, -2], l1: [180, 180, 90], l2: [90, 90, 0] }
    },
    {
      id: 'dolphin', name: 'Dolphin Pose', sk: 'Ardha Pincha Mayurasana', lvl: 'a', unlock: 3, pos: 'kneel', use: ['main'],
      tg: ['shoulders', 'hamstrings', 'core'], br: 'deepen', hold: 25,
      steps: ['From hands and knees, lower onto your forearms with elbows under shoulders.',
        'Tuck your toes and lift your hips up and back, like Down Dog on forearms.',
        'Press firmly through your forearms and lift your shoulders away from the floor.',
        'Keep your knees bent as much as needed for a long spine.'],
      tip: 'Keep your knees on the floor and just press your hips back.',
      why: 'Opens tight shoulders and hamstrings while strengthening the upper back.',
      fig: { t: 45, hd: 45, a1: [90, 0], a2: [91, 1], l1: [129, 129, 0], l2: [127, 131, 0] }
    },
    {
      id: 'revolvedTriangle', name: 'Revolved Triangle', sk: 'Parivrtta Trikonasana', lvl: 'a', unlock: 4, pos: 'stand', use: ['main'],
      tg: ['hamstrings', 'spine', 'balance'], br: 'deepen', hold: 25, sides: true,
      steps: ['From Pyramid, with hips square, place the opposite hand on a block or the floor outside your front foot.',
        'Lengthen your spine forward.',
        'Twist your chest open and reach the top arm to the ceiling.',
        'Keep both legs firm and breathe into the twist.'],
      tip: 'Use a tall block and a shorter stance. Rotate only as far as your back stays long.',
      why: 'Combines a hamstring stretch with a balanced spinal twist.',
      fig: { t: 25, hd: -20, a1: [80, 95], a2: [-95, -90], l1: [62, 62, 0], l2: [118, 118, 0] }
    },
    {
      id: 'reversePlank', name: 'Reverse Plank', sk: 'Purvottanasana', lvl: 'a', unlock: 5, pos: 'seat', use: ['main'],
      tg: ['chest', 'shoulders', 'glutes', 'core'], br: 'steady', hold: 20,
      steps: ['Sit with legs extended and hands behind your hips, fingers pointing toward your feet.',
        'Press into your hands and heels and lift your hips.',
        'Make one long line from shoulders to feet, pressing the soles toward the floor.',
        'Keep your neck long, gazing up or slightly forward.'],
      tip: 'Bend your knees with feet flat for a "tabletop" version.',
      why: 'Opens the chest and fronts of the shoulders and strengthens the back body.',
      fig: { t: 204, hd: 204, a1: [90, 90], a2: [91, 89], l1: [24, 24, 0], l2: [25, 23, 0] }
    },
    {
      id: 'eagle', name: 'Eagle Pose', sk: 'Garudasana', lvl: 'a', unlock: 6, pos: 'stand', use: ['main'],
      tg: ['balance', 'hips', 'shoulders', 'glutes'], br: 'balance', hold: 20, sides: true,
      steps: ['Bend your knees slightly and cross one thigh over the other.',
        'Hook the top foot behind the standing calf if it\'s available.',
        'Wrap your arms into Eagle Arms, with the same arm on the bottom as the top leg.',
        'Sink your hips and lift your elbows.'],
      tip: 'Rest the toes of the crossed leg on the floor like a kickstand.',
      why: 'Stretches the outer hips and upper back while building balance and focus.',
      fig: { t: -72, hd: -80, a1: [5, -85], a2: [10, -80], l1: [15, 110, 120], l2: [25, 115, 0] }
    },
    {
      id: 'standingSplit', name: 'Standing Split', sk: 'Urdhva Prasarita Eka Padasana', lvl: 'a', unlock: 7, pos: 'stand', use: ['main'],
      tg: ['hamstrings', 'balance', 'hips'], br: 'deepen', hold: 20, sides: true,
      steps: ['From a forward fold, shift weight into one foot.',
        'Lift the other leg up behind you, toes pointing down.',
        'Let your torso fold toward the standing leg; hands on the floor or blocks.',
        'Keep your hips fairly square rather than flipping open.'],
      tip: 'Keep the standing knee bent and hands on blocks.',
      why: 'A deep hamstring stretch that also trains balance.',
      fig: { t: 70, hd: 80, a1: [20, 110], a2: [22, 108], l1: [-110, -110, -110], l2: [90, 90, 0] }
    },
    {
      id: 'revolvedSideAngle', name: 'Revolved Side Angle', sk: 'Parivrtta Parsvakonasana', lvl: 'a', unlock: 8, pos: 'stand', use: ['main'],
      tg: ['spine', 'hips', 'quads', 'core'], br: 'deepen', hold: 25, sides: true,
      steps: ['From High Lunge, bring your palms together at your chest.',
        'Twist toward the front leg and hook the opposite elbow outside the front knee.',
        'Press your palms together to open the chest.',
        'Keep the back leg strong and lengthen through the crown of your head.'],
      tip: 'Lower the back knee to the floor.',
      why: 'A strong twist that wrings out the spine and builds leg strength.',
      fig: { t: -30, hd: -40, a1: [70, -110], a2: [60, -100], l1: [20, 90, 0], l2: [148, 148, 120] }
    },
    {
      id: 'chaturanga', name: 'Chaturanga', sk: 'Chaturanga Dandasana', lvl: 'a', unlock: 9, pos: 'prone', use: ['main'],
      tg: ['core', 'shoulders', 'chest'], br: 'steady', hold: 15,
      steps: ['Start in a high plank with shoulders over wrists.',
        'Shift slightly forward onto your toes.',
        'Bend your elbows straight back, hugging your ribs, until upper arms are parallel to the floor.',
        'Keep your body in one line, then lower down or press back up.'],
      tip: 'Lower your knees first and keep the same elbow position.',
      why: 'Builds pushing strength and full-body core control.',
      fig: { t: -5, hd: -5, a1: [180, 90], a2: [181, 89], l1: [173, 173, 95], l2: [174, 172, 95] }
    },
    {
      id: 'frog', name: 'Frog Pose', sk: 'Mandukasana', lvl: 'a', unlock: 10, pos: 'kneel', use: ['main'],
      tg: ['hips', 'glutes', 'lowBack'], br: 'release', hold: 40,
      steps: ['From hands and knees, slide your knees wide apart.',
        'Keep your ankles in line with your knees, with the insides of your feet on the floor.',
        'Lower onto your forearms.',
        'Let your hips sink back slowly. This one is intense, so go gently.'],
      tip: 'Pad your knees well and only widen them a little at a time.',
      why: 'One of the deepest openers for the inner thighs and hips.',
      fig: { t: -90, tl: 0.45, a1: [60, 90], a2: [120, 90], l1: [8, 95, 0, 0.55], l2: [172, 85, 180, 0.55] }
    },
    {
      id: 'heron', name: 'Heron Pose', sk: 'Krounchasana', lvl: 'a', unlock: 11, pos: 'seat', use: ['main'],
      tg: ['hamstrings', 'calves', 'quads'], br: 'deepen', hold: 25, sides: true,
      steps: ['Sit with one leg folded back beside your hip, as in Hero Pose.',
        'Bend the other knee and hold that foot with both hands.',
        'Straighten the leg up toward the sky as far as it allows.',
        'Sit tall and draw the leg toward you without rounding your back.'],
      tip: 'Use a strap around the foot and keep a bend in the knee.',
      why: 'A seated hamstring stretch that also lengthens the front of the folded leg.',
      fig: { t: -95, hd: -95, a1: [-30, 0], a2: [-28, 2], l1: [-60, -60, 0], l2: [5, 180, 180] }
    },
    {
      id: 'handToToeStanding', name: 'Standing Hand-to-Big-Toe', sk: 'Utthita Hasta Padangusthasana', lvl: 'a', unlock: 12, pos: 'stand', use: ['main'],
      tg: ['balance', 'hamstrings', 'hips'], br: 'balance', hold: 20, sides: true,
      steps: ['Stand tall and hug one knee in.',
        'Hold the big toe with two fingers, or loop a strap around the foot.',
        'Extend the leg forward as you stand tall.',
        'Keep both hips level and the standing leg strong.'],
      tip: 'Keep the knee bent and hold the shin, or rest your heel on a chair.',
      why: 'Challenges balance while lengthening the hamstrings.',
      fig: { t: -90, strap: true, a1: [20, 15], a2: [110, 40], l1: [0, 0, -90], l2: [90, 90, 0] }
    },
    {
      id: 'wildThing', name: 'Wild Thing', sk: 'Camatkarasana', lvl: 'a', unlock: 13, pos: 'prone', use: ['main'],
      tg: ['chest', 'shoulders', 'sideBody', 'hips'], br: 'deepen', hold: 20, sides: true,
      steps: ['From Side Plank, step the top foot behind you and plant it on the floor.',
        'Lift your hips and let your chest open toward the ceiling.',
        'Sweep the top arm overhead.',
        'Keep pressing firmly through the bottom hand.'],
      tip: 'Keep the bottom knee down and just open the chest.',
      why: 'An energizing, playful backbend that opens the whole front body.',
      fig: { t: 160, c: 4, hd: 180, a1: [100, 100], a2: [190, 200], l1: [45, 105, 0], l2: [30, 95, 0] }
    },
    {
      id: 'revolvedHeadToKnee', name: 'Revolved Head-to-Knee', sk: 'Parivrtta Janu Sirsasana', lvl: 'a', unlock: 14, pos: 'seat', use: ['main'],
      tg: ['sideBody', 'hamstrings', 'shoulders'], br: 'deepen', hold: 30, sides: true,
      steps: ['Sit with one leg extended out to the side and the other foot to your inner thigh.',
        'Slide the near forearm down along the inside of the extended leg.',
        'Sweep the top arm overhead toward the extended foot.',
        'Turn your chest toward the ceiling.'],
      tip: 'Rest the bottom elbow on a block and keep the top hand on your head.',
      why: 'A deep side-body stretch from the hip all the way to the fingertips.',
      fig: { t: -35, c: -4, hd: -20, a1: [40, 20], a2: [-50, -15], l1: [5, 5, -80], l2: [170, 10, 0] }
    },
    {
      id: 'crow', name: 'Crow Pose', sk: 'Bakasana', lvl: 'a', unlock: 15, pos: 'stand', use: ['main'],
      tg: ['core', 'shoulders', 'balance'], br: 'balance', hold: 15,
      steps: ['Squat and plant your hands shoulder-width apart, fingers spread.',
        'Bend your elbows and place your knees high on the backs of your upper arms.',
        'Shift forward and lift one foot, then the other.',
        'Gaze slightly forward and round your upper back.'],
      tip: 'Put a pillow in front of you, and practice lifting one foot at a time.',
      why: 'Builds core strength, focus and confidence.',
      fig: { t: 30, hd: 20, a1: [100, 85], a2: [102, 83], l1: [45, 200, 180], l2: [47, 198, 180] }
    },
    {
      id: 'fullSplits', name: 'Full Splits', sk: 'Hanumanasana', lvl: 'a', unlock: 16, pos: 'kneel', use: ['main'],
      tg: ['hamstrings', 'hips', 'quads'], br: 'release', hold: 30, sides: true,
      steps: ['From Half Splits, place a block under each hand.',
        'Slowly slide the front heel forward and the back knee back.',
        'Lower only as far as you can stay square and pain-free. Rest your hips on a block.',
        'Lift your arms overhead if you\'re steady.'],
      tip: 'Keep a block or bolster under your hips. Most people never need to touch the floor.',
      why: 'The culmination of hamstring and hip-flexor work.',
      fig: { t: -90, a1: [-92, -90], a2: [-88, -90], l1: [2, 2, -80], l2: [178, 178, 180] }
    },

    // ───────────── Cool-down & rest ─────────────
    {
      id: 'reclinedButterfly', name: 'Reclined Butterfly', sk: 'Supta Baddha Konasana', lvl: 'b', pos: 'supine', use: ['cool'],
      tg: ['hips', 'chest'], br: 'release', hold: 60,
      steps: ['Lie on your back and bring the soles of your feet together.',
        'Let your knees fall open.',
        'Rest your arms out to the sides, palms up.',
        'Let gravity do all the work.'],
      tip: 'Support each knee with a pillow so you can fully relax.',
      why: 'A restful hip opener that also calms the nervous system.',
      fig: { top: true, t: -90, a1: [40, 40], a2: [140, 140], l1: [30, 150, 90], l2: [150, 30, 90] }
    },
    {
      id: 'legsUpWall', name: 'Legs Up the Wall', sk: 'Viparita Karani', lvl: 'b', pos: 'supine', use: ['cool'],
      tg: ['hamstrings', 'lowBack'], br: 'release', hold: 60,
      steps: ['Sit sideways next to a wall.',
        'Swing your legs up the wall as you lie back.',
        'Scoot your hips close to the wall.',
        'Rest your arms and close your eyes.'],
      tip: 'No wall? Rest your calves on the seat of a chair or couch.',
      why: 'Eases tired legs and gives the low back a complete rest.',
      fig: Object.assign({}, SUP, { wall: true, a1: [16, 12], a2: [15, 13], l1: [-90, -90, 180], l2: [-89, -91, 180] })
    },
    {
      id: 'savasana', name: 'Final Rest', sk: 'Savasana', lvl: 'b', pos: 'supine', use: ['final'],
      tg: ['spine'], br: 'release', hold: 60,
      steps: ['Lie on your back with legs long and relaxed.',
        'Let your arms rest by your sides, palms up.',
        'Close your eyes and let your whole body feel heavy.',
        'Follow the glow, then simply rest.'],
      tip: 'Slide a pillow under your knees to take pressure off your low back.',
      why: 'Lets your body absorb the work and your nervous system settle.',
      fig: Object.assign({}, SUP, { a1: [16, 14], a2: [15, 13], l1: [8, 8, -70], l2: [9, 9, -60] })
    }
  ];

  window.YogaData = { POSES, BREATH, TARGETS };
})();
