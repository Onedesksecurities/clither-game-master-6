
export const config = {

    // ================================================
    // SERVER SETTINGS
    // ================================================
    /** The port the WebSocket server will listen on. */
    PORT: 8080,
    /** The rate at which the server updates the game state, in ticks per second. */
    TICK_RATE: 60,
    /** The maximum number of players allowed in a single game room. */
    MAX_PLAYERS_PER_ROOM: 50,
    /** The full URL for the client to connect to the WebSocket server. */
    // SERVER_URL: 'ws://192.168.18.60:8080',
    SERVER_URL: 'ws://139.84.147.29:8080',
    // ================================================
    // SHARED GAMEPLAY & PHYSICS
    // ================================================
    /**
     * Defines the radius of the circular play area. The snake dies if it moves
     * beyond this boundary. A larger value creates a bigger map.
     */
    WORLD_RADIUS: 800,
    /**
     * Controls the size of the visual grid in the background. This is purely
     * cosmetic and helps players gauge distance and movement.
     */
    GRID_SIZE: 20,
    /** The angle (in degrees) at which a snake is considered to be heading into a wall for collision purposes. (Server-side) */
    WALL_COLLISION_ANGLE_DEGREES: 180,
    /** How far past the world radius a snake's head must go to be instantly killed. (Server-side) */
    WALL_KILL_THRESHOLD: 5,

    spectatorMode: {
        isOn: true,
        username: "spectator"
    },

    snake: {

        SEGMENT_LERP_FACTOR: 0.2,
        // --- Core Physics (Must match between client and server) ---
        /** The number of body segments the snake starts with. */
        INITIAL_SEGMENT_COUNT: 5,
        /** The snake must have at least this many segments to use the boost ability. */
        MIN_BOOST_LENGTH: 5,
        /** The snake's normal movement speed in pixels per frame. */
        BASE_SPEED: 2.5,
        /** When boosting, the snake's speed is multiplied by this value. (e.g., 3 means 3x speed). */
        BOOST_SPEED_MULTIPLIER: 3,

        TURN_SPEED: 0.1,
        /**
         * The snake's turning ability is penalized as it gets longer. This divisor
         * controls how much length affects the penalty. A smaller divisor means
         * length has a greater impact on reducing turn speed.
         */
        LENGTH_TURN_PENALTY_DIVISOR: 400,
        /** The maximum penalty that can be applied to the turn speed, preventing it from becoming zero. */
        MAX_LENGTH_TURN_PENALTY: 4,
        /** The base radius of each snake segment in pixels. This scales up as the snake grows. */
        BASE_SEGMENT_RADIUS: 10,
        /** The base distance between the centers of each snake segment. */
        BASE_SEGMENT_SPACING: 5,

        BOOST_SEGMENT_SPACING_MULTIPLIER: 1.4,
        /**
         * Controls how much the snake's radius increases per segment, relative to its
         * base radius. A higher value makes the snake get thicker faster as it grows.
         */
        GROWTH_FACTOR: 0.009,
        /** The maximum number of segments that contribute to the snake's growth in thickness. */
        MAX_GROWTH_LENGTH: 300,
        /** The number of score points awarded for each unit of length gained. */
        SCORE_PER_LENGTH_UNIT: 2,
        /**
         * A multiplier for the segment spacing used to calculate an avoidance radius.
         * This helps prevent body segments from bunching up and overlapping too much,
         * creating a smoother, more natural follow-the-leader effect.
         */

        LOOP_TIGHTENING_FACTOR: 0.6,   // how aggressively spacing is reduced where curvature is high (0..1)
        LOOP_MAX_CURVATURE: 1.2,       // curvature (radians) that maps to full tightening (around ~70° = 1.2 rad)
        MIN_SPACING_FACTOR: 0.6,        // the smallest allowed spacing multiplier (avoid collapse)
        PATH_PRUNE_MARGIN: 10,          // extra distance to keep in path beyond needed snake length
        SAMPLE_OFFSET_MULT: 1.0,
        BASE_AVOIDANCE_RADIUS: 2.1,

        // The distance the collision tips are projected in front of the snake's head,
        // as a percentage of the snake's radius. 1.0 means one full radius distance.
        SNAKE_COLLISION_TIP_PROJECTION_FACTOR: 0.2,

        // The angle (in degrees) for the side-tips. This creates a collision arc.
        // A value of 20 means tips will be checked at -20, 0, and +20 degrees
        // from the snake's heading.
        SNAKE_COLLISION_TIP_ANGLE_DEGREES: 20,
        /** Size multiplier for the growth of each segment. */
        SEGMENT_GROWTH_MULTIPLIER: 0.2,
        /** An additional turning penalty applied when boosting. */
        BOOST_TURN_PENALTY: 0.5,
        /**
         * The amount of "length" the snake loses per frame while boosting. This is
         * used to calculate score reduction and when to drop food pellets.
         */
        LENGTH_DRAIN_RATE_PER_TICK: 0.01,

        // --- Gameplay Rules (Server authoritative, but client can know them) ---
        /** The minimum radius from the center of the world where snakes can spawn. */
        SAFE_SPAWN_RADIUS: 200,
        /** How far from a dead snake's body its food pellets should spawn. */
        DEATH_FOOD_SPAWN_OFFSET: 25,
        /** The minimum "length" value of a food pellet dropped during boost. */
        BOOST_LENGTH_TO_DROP_MIN: 0.1,
        /** The maximum "length" value of a food pellet dropped during boost. */
        BOOST_LENGTH_TO_DROP_MAX: 1.5,

        // --- Shared Aesthetics ---
        COLORS: [0xf2d5cf, 0xeebebe, 0xf4b8e4, 0xca9ee6, 0xe78284, 0xea999c, 0xef9f76, 0xe5c890, 0xa6d189, 0x81c8be, 0x99d1db, 0x85c1dc, 0x8caaee, 0xbabbf1],
        /**
         * An array of brightness values (0 to 1) used to create an alternating
         * light-and-dark pattern along the snake's body segments.
         */
        BRIGHTNESS_PATTERN: [0.9, 0.925, 0.95, 0.975, 1.0, 0.975, 0.95, 0.925, 0.9],

        // BRIGHTNESS_PATTERN: [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.2, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6],

        //BRIGHTNESS_PATTERN: [1.0],

        LOOP_DETECTION_LENGTH: 30,
        // ================================================
        // CLIENT-SIDE ONLY SETTINGS
        // ================================================
        /**
         * The maximum number of historical positions (path points) the snake's
         * head leaves behind. Segments follow this path. A larger buffer allows
         * for a much longer snake but consumes more memory.
         */
        PATH_BUFFER_SIZE: 10000,
        /**
         * The time in seconds it takes for the snake to smoothly accelerate from
         * base speed to full boost speed. A lower value means faster acceleration.
         */
        BOOST_ACCELERATION_TIME_S: 500 / 1000,
        /**
         * How responsive the snake's turning is to mouse/joystick movement.
         * Higher values make the snake turn more sharply.
         */
        TURN_SPEED_SENSITIVITY: 0.1,
        /** A base factor that contributes to the maximum turning speed. */
        TURN_SPEED_FACTOR: 0.0325,
        /** A constant minimum turn speed, ensuring the snake can always turn slightly. */
        TURN_SPEED_BASE: 0.005,
        /**
         * Controls the speed of the smooth animation when the snake grows or shrinks.
         * It's a lerp (linear interpolation) factor; a value closer to 1 means faster,
         * more instant visual changes.
         */
        GROWTH_ANIMATION_SPEED: 0.2,
        /** The duration in seconds for the boost glow effect to fade out after boosting stops. */
        BOOST_FADE_DURATION_S: 180 / 1000,
        /** The speed of the pulsating glow animation that travels down the snake's body when boosting. */
        BOOST_GLOW_SPEED: 0.025,
        /** The length of the waves in the pulsating boost glow effect. */
        BOOST_GLOW_WAVELENGTH: 10,
        /** The minimum opacity (alpha) of the boost glow effect. */
        BOOST_GLOW_MIN_ALPHA: 0.2,
        /** The maximum opacity (alpha) of the boost glow effect. */
        BOOST_GLOW_MAX_ALPHA: 0.6,
        /** The speed at which the heading arrow's opacity returns to normal after boosting stops. */
        HEADING_ARROW_BOOST_RETURN_SPEED: 0.008,
        /** The speed of the heading arrow's blinking animation while boosting. */
        HEADING_ARROW_BLINK_SPEED: 4 * 2 * Math.PI,
        /** The minimum scale modifier for the heading arrow. */
        HEADING_ARROW_MIN_SCALE_MOD: 1.1,
        /** The maximum scale modifier for the heading arrow. */
        HEADING_ARROW_MAX_SCALE_MOD: 1.6,
        /** A factor determining the radius of the snake's eyes relative to its head radius. */
        EYE_RADIUS_FACTOR: 0.41,
        /** A factor determining how far the pupils can move from the center of the eyes. */
        PUPIL_DISTANCE_FACTOR: 0.35,
        /** An offset for the pupil's orbit to give a more 3D look. */
        PUPIL_ORBIT_OFFSET_FACTOR: 0.015,
        /** The angle at which the pupils are tilted, giving the snake a more expressive look. */
        PUPIL_TILT_ANGLE: Math.PI / 12,
        /**
         * A brief period in seconds after respawning where the snake is unable to
         * boost, preventing accidental boosting immediately after death.
         */
        RESPAWN_GRACE_PERIOD_S: 2,
        /** A factor for determining if the segment's glow should have same color as the segment. TRUE = Segment Color FALSE = GLOW_COLOR */
        SAME_GLOW_COLOR: true,
        /** The color of the segment glow when the snake is in Boost mode */
        GLOW_COLOR: 0x39FF14,
        /** Size multiplier for the glow around the snake. 1.0 = same size as the segment, 2.0 = twice the size as the segment */
        GLOW_SIZE_MULTIPLIER: 2,
    },

    food: {
        COLORS: [0xf5e0dc, 0xf2cdcd, 0xf5c2e7, 0xcba6f7, 0xf38ba8, 0xeba0ac, 0xfab387, 0xf9e2af, 0xa6e3a1, 0x94e2d5, 0x89dceb, 0x74c7ec, 0x89b4fa, 0xb4befe],
        /** The base radius of a food particle in pixels. */
        BASE_RADIUS: 3,
        /** The maximum radius a food particle can have, capping its size. */
        MAX_FOOD_RADIUS: 7,
        /** The amount of food spawned per segment when a snake dies. */
        DEATH_FOOD_PER_SEGMENT: 2,
        /** A multiplier for the value of food dropped by a dead snake. */
        DEATH_FOOD_VALUE_FACTOR: 0.5,
        /** The radius around the player to consider for food updates. */
        FOOD_RADIUS_OF_INTEREST: 600,

        // ================================================
        // CLIENT-SIDE ONLY SETTINGS
        // ================================================
        /** The base radius around the snake's head where food starts being attracted. */
        ATTRACTION_RADIUS_BASE: 33,
        /** This factor increases the food attraction radius as the snake grows thicker. */
        ATTRACTION_RADIUS_GROWTH_FACTOR: 1.5,
        /** The speed at which food travels towards the snake's head once attracted. */
        ATTRACTION_SPEED: 300,
        /**
         * The final scale of the food pellet (as a percentage of its original size)
         * just before it's consumed. This creates a shrinking effect.
         */
        FINAL_SCALE_PERCENT: 0.9,
        /**
         * The angle (in radians) of the cone in front of the snake's head where
         * food is actively attracted. This prevents food behind the snake from
         * being pulled forward. (Math.PI / 3 is 60 degrees).
         */
        ATTRACTION_WIDE_CONE_ANGLE: Math.PI / 3,

        MIN_RESPAWN_DISTANCE: 200, // Minimum distance from consuming snake
        RESPAWN_ATTEMPTS: 50, // How many positions to try when respawning

        DEATH_FOOD_RADIUS: 15
    },

    // ================================================
    // PURELY CLIENT-SIDE SETTINGS
    // ================================================
    camera: {
        /** The default zoom level of the camera. */
        ZOOM_BASE: 1.0,
        /** A factor that controls how much the camera zooms out as the snake gets longer. */
        ZOOM_FACTOR: 0.01,
        /**
         * An exponent applied to the snake's length to create a non-linear zoom effect.
         * A value less than 1 means the zoom-out effect diminishes as the snake gets very long.
         */
        ZOOM_POWER: 0.6,
        /**
         * The speed of the smooth zoom transition. It's a lerp factor; a higher
         * value means a faster, more abrupt zoom.
         */
        ZOOM_SPEED: 0.05,
    },
    ui: {
        /** The maximum distance in pixels the joystick can be dragged from its base position. */
        JOYSTICK_MAX_DRAG: 120,
        /** The padding from the screen edges where the joystick can be placed. */
        JOYSTICK_SCREEN_PADDING: 50,
        /** The minimum distance the pointer must be from the snake for the heading arrow to appear. */
        MIN_ARROW_DISTANCE: 60,
    },
    graphics: {
        background: {
            /** The radius of the hexagonal background tiles in pixels. */
            TILE_RADIUS: 35,
            /** The corner radius of the hexagonal tiles, giving them a softer look. */
            TILE_CORNER_RADIUS: 6,
            /** A multiplier for the spacing between tiles. >1 creates gaps, <1 causes overlap. */
            TILE_SPACING_FACTOR: 1.3,
        },
        textures: {
            segment: {
                /** How much to darken the edge color of a colored snake segment relative to its center. */
                edgeColorDarkenFactor: -0.3,
                /** For grayscale segments, this multiplies the center brightness to get the edge brightness. */
                grayscaleEdgeColorMultiplier: 1.0,
            },
            headingArrow: {
                /** The width of the arrow's outline in pixels. */
                lineWidth: 2,
                /** The color of the arrow's outline. */
                lineColor: 0x1a1a1a,
                /** The opacity of the arrow's outline. */
                lineAlpha: 1,
                /** The alignment of the line (0.5 for center). */
                lineAlignment: 0.5,
                /** An array of {x, y} coordinates that define the shape of the arrow polygon. */
                points: [
                    { x: 0, y: 6 }, { x: 8, y: 4 }, { x: 8, y: 10 },
                    { x: 20, y: 0 },
                    { x: 8, y: -10 }, { x: 8, y: -4 }, { x: 0, y: -6 }
                ],
                /** The resolution multiplier for the generated texture to ensure sharpness. */
                resolution: 2,
            },
            food: {
                /** The base radius for the food orb texture. */
                radius: 15,
                /** The size of the glow effect extending beyond the radius. */
                glowPower: 20,
                /** Defines the radial gradient for the food's glow. */
                glowGradient: {
                    start: 'rgba(255, 255, 255, 0)',
                    end: 'rgba(255, 255, 255, 0)'
                },
                /** The fill color/style for the central orb of the food. */
                fill: 'rgba(255, 255, 255, 0.9)'
            },
            deathFood: {
                /** The base radius for the food orbs dropped on death. */
                radius: 20,
                /** The size of the glow effect for death food. */
                glowPower: 25,
                /** The base opacity of the death food's glow. */
                glowAlpha: 0.4,
                /** The positions of color stops for the death food's glow gradient. */
                gradientStops: [0, 0.6, 1]
            },
            glow: {
                /** The base radius for the generic white glow texture used for boosting. */
                radius: 39,
                /** The radial gradient for the boost glow, creating a soft falloff. */
                gradient: {
                    start: 'rgba(255, 255, 255, 1)',
                    mid: 'rgba(255, 255, 255, 0.3)',
                    end: 'rgba(255, 255, 255, 0)'
                }
            },
            shadow: {
                /** A multiplier for the segment radius to determine the shadow's radius. */
                radiusMultiplier: 1.2,
                /** The radial gradient for the soft shadow effect under the snake. */
                gradient: {
                    start: 'rgba(0, 0, 0, 0.2)',
                    end: 'rgba(0, 0, 0, 0)'
                }
            },
            highlight: {
                /** The linear gradient for the shiny highlight streak on the snake's body. */
                gradient: {
                    mid: 'rgba(255, 255, 255, 0.2)',
                    edge: 'rgba(255, 255, 255, 0)'
                }
            },
            snakeHead: {
                /** The radius of the eyes as a factor of the head's radius. */
                eyeRadiusFactor: 0.405,
                /** The distance of the eyes from the center of the head, as a factor of the head's radius. */
                eyeDistFactor: 0.417,
                /** The color of the sclera (the white part) of the eyes. */
                eyeColor: 0xFFFFFF,
                /** The color of the pupils. */
                pupilColor: 0x222222,
                /** The radius of the pupils as a factor of the eye's radius. */
                pupilRadiusFactor: 0.65,
            },
            /** An array of hexadecimal color codes from which a snake's color is randomly chosen. */
            snakeColors: [0x40A199, 0xFC3E47, 0x3EFC47, 0x473EFC, 0xFC473E, 0xFCEC3E]
        }
    },
};