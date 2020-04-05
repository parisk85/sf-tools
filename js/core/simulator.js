function getRuneValue (item, rune) {
    return item.AttributeTypes[2] == rune ? item.Attributes[2] : 0;
}

function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

// Rune / Rune table
const RUNE = {
    GOLD: 31,
    EPIC_FIND: 32,
    ITEM_QUALITY: 33,
    XP: 34,
    HEALTH: 35,
    FIRE_RESISTANCE: 36,
    COLD_RESISTANCE: 37,
    LIGHTNING_RESISTANCE: 38,
    TOTAL_RESITANCE: 39,
    FIRE_DAMAGE: 40,
    COLD_DAMAGE: 41,
    LIGHTNING_DAMAGE: 42
};

// SFGAME classes
const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;
const ASSASSIN = 4;
const BATTLEMAGE = 5;
const BERSERKER = 6;
const DEMONHUNTER = 7;
const DRUID = 8;

// New testing classes
const NECROMANCER = 20;

class FighterModel {
    static create (index, player) {
        switch (player.Class) {
            case WARRIOR:
                return new WarriorModel(index, player);
            case BERSERKER:
                return new BerserkerModel(index, player);
            case BATTLEMAGE:
                return new BattlemageModel(index, player);
            case SCOUT:
                return new ScoutModel(index, player);
            case DEMONHUNTER:
                return new DemonHunterModel(index, player);
            case ASSASSIN:
                return new AssassinModel(index, player);
            case MAGE:
                return new MageModel(index, player);
            case NECROMANCER:
                return new NecromancerModel(index, player);
            default:
                return null;
        }
    }

    // Constructor
    constructor (index, player) {
        this.Index = index;
        this.Player = player;
    }

    // Defense Attribute
    getDefenseAtribute (source) {
        switch (source.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength.Total / 2;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity.Total / 2;
            case MAGE:
            case NECROMANCER:
                return this.Player.Intelligence.Total / 2;
            default:
                return 0;
        }
    }

    // Primary Attribute
    getPrimaryAttribute () {
        switch (this.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength.Total;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity.Total;
            case MAGE:
            case NECROMANCER:
                return this.Player.Intelligence.Total;
            default:
                return 0;
        }
    }

    // Damage Reduction
    getDamageReduction (source) {
        if (source.Player.Class == MAGE || source.Player.Class == NECROMANCER) {
            return 0;
        } else if (this.Player.Class == BATTLEMAGE) {
            return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level + 40);
        } else {
            return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level);
        }
    }

    // Maximum Damage Reduction
    getMaximumDamageReduction () {
        switch (this.Player.Class) {
            case WARRIOR:
            case BATTLEMAGE:
            case DEMONHUNTER:
                return 50;
            case SCOUT:
            case ASSASSIN:
            case BERSERKER:
                return 25;
            case MAGE:
            case NECROMANCER:
                return 10;
            default:
                return 0;
        }
    }

    // Block Chance
    getBlockChance (source) {
        if (source.Player.Class == MAGE || source.Player.Class == NECROMANCER) {
            return 0;
        } else {
            switch (this.Player.Class) {
                case SCOUT:
                case ASSASSIN:
                    return 50;
                case WARRIOR:
                    return 25;
                default:
                    return 0;
            }
        }
    }

    // Critical Chance
    getCriticalChance (target) {
        return Math.min(50, this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    // Critical Multiplier
    getCriticalMultiplier (weapon, target) {
        return 2 * (1 + 0.05 * Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator)) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    // Health
    getHealth () {
        var a = 1 + this.Player.Potions.Life / 100;
        var b = 1 + this.Player.Dungeons.Player / 100;
        var c = 1 + this.Player.Runes.Health / 100;
        var d = this.Player.Level + 1;
        var e = this.Player.Class == WARRIOR || this.Player.Class == BATTLEMAGE ? 5 : (this.Player.Class == MAGE || this.Player.Class == NECROMANCER ? 2 : 4)

        return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(this.Player.Constitution.Total * a) * b) * c) * d) * e);
    }

    // Get damage range
    getDamageRange (weapon, target) {
        let mp = 1 - target.getDamageReduction(this) / 100;

        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE.FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE.COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE.LIGHTNING_DAMAGE) / 100);

        let m = (1 + this.Player.Dungeons.Group / 100) * mp * (1 + mf + mc + ml);

        let aa = this.getPrimaryAttribute();
        let ad = target.getDefenseAtribute(this);

        let dm = m * (1 + Math.max(aa / 2, aa - ad) / 10);

        return {
            Max: Math.ceil(dm * weapon.DamageMax),
            Min: Math.ceil(dm * weapon.DamageMin)
        };
    }

    // Initialize model
    initialize (target) {
        // Round modifiers
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment;
        this.SkipChance = this.getBlockChance(target);
        this.CriticalChance = this.getCriticalChance(target);
        this.TotalHealth = this.getHealth();
this.RepeatAttackChance = this.Player.Class == 6 ? 50 : 0;this.RevivalChance = this.getRevivalChance(target);
        // Weapon
        var weapon = this.Player.Items.Wpn1;
        this.Weapon1 = {
            Range: this.getDamageRange(weapon, target),
            Critical: this.getCriticalMultiplier(weapon, target)
        }
    }    getRevivalChance (source) {
        if (this.Player.Class == 7 && source.Player.Class != 2) {
            return 25;
        } else {
            return 0;
        }
    }


    onFightStart (target) {
        return false;
    }

    onDeath (source) {

    }

    onDamageDealt (target, damage) {

    }

    onDamageTaken (source, damage) {
        this.Health -= damage;
        if (this.Health < 0) {
            this.onDeath(source);
        }

        return this.Health > 0;
    }

    onRoundEnded (action) {

    }
}

class WarriorModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }
}

class MageModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (weapon, target) {
        if (target.Player.Class == BERSERKER) {
            var range = super.getDamageRange(weapon, target);
            return {
                Max: Math.ceil(range.Max * 2),
                Min: Math.ceil(range.Min * 2)
            }
        } else {
            return super.getDamageRange(weapon, target);
        }
    }
}

class ScoutModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }
}

class AssassinModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (weapon, target) {
        var range = super.getDamageRange(weapon, target);
        return {
            Max: Math.ceil(range.Max * 5 / 8),
            Min: Math.ceil(range.Min * 5 / 8)
        }
    }

    initialize (target) {
        super.initialize(target);

        var weapon = this.Player.Items.Wpn2;
        if (weapon) {
            this.Weapon2 = {
                Range: this.getDamageRange(weapon, target),
                Critical: this.getCriticalMultiplier(weapon, target)
            }
        }
    }
}

class BattlemageModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    onFightStart (target) {
        if (target.Player.Class == MAGE || target.Player.Class == BATTLEMAGE || target.Player.Class == NECROMANCER) {
            return 0;
        } else if (target.Player.Level < this.Player.Level + 10 || target.Player.Class == BERSERKER) {
            return Math.ceil(target.TotalHealth / 3);
        } else if (target.Player.Class == WARRIOR) {
            return Math.ceil(this.TotalHealth / 4);
        } else if (target.Player.Class == SCOUT || target.Player.Class == ASSASSIN || target.Player.Class == DEMONHUNTER) {
            return Math.ceil(this.TotalHealth / 5);
        } else {
            return 0;
        }
    }
}

class BerserkerModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.RoundEnded = true;
    }

    getDamageRange (weapon, target) {
        var range = super.getDamageRange(weapon, target);
        return {
            Max: Math.ceil(range.Max * 3 / 2),
            Min: Math.ceil(range.Min * 3 / 2)
        }
    }

    onRoundEnded (action) {
        while (getRandom(50) && action());
    }
}

class DemonHunterModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
        this.DamageTaken = true;
    }

    onDeath (source) {
        if (source.Player.Class != MAGE && source.Player.Class != NECROMANCER && getRandom(25)) {
            this.Health = this.getHealth();
        }
    }
}

class DruidModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }
}

class NecromancerModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
        this.DamageDealt = true;
    }

    onDamageDealt (target, damage) {
        this.Health += damage / 5;
    }

    getDamageRange (weapon, target) {
        if (target.Player.Class == BERSERKER) {
            var range = super.getDamageRange(weapon, target);
            return {
                Max: Math.ceil(range.Max * 2),
                Min: Math.ceil(range.Min * 2)
            }
        } else {
            return super.getDamageRange(weapon, target);
        }
    }
}

// WebWorker hooks
self.addEventListener('message', function (message) {
    var ts = Date.now();

    // Sent vars
    var player = message.data.player;
    var players = message.data.players;
    var single = message.data.single;
    var iterations = message.data.iterations || 100000;

    // Sim type decision
    if (single) {
        new FightSimulator().simulateSingle(player, players, iterations);
        self.postMessage({
            command: 'finished',
            results: players,
            time: Date.now() - ts
        });
    } else {
        new FightSimulator().simulateMultiple(player, players, iterations);
        self.postMessage({
            command: 'finished',
            results: player,
            time: Date.now() - ts
        });
    }

    self.close();
});

class FightSimulator {
    // Fight group
    simulate (players, iterations = 100000) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            for (var j = 0; j < players.length; j++) {
                if (i != j) {
                    var s = 0;
                    this.cache(players[i].player, players[j].player);
                    for (var k = 0; k < iterations; k++) {
                        s += this.fight();
                    }

                    score += s;

                    if (s > max) {
                        max = s;
                    }

                    if (s < min) {
                        min = s;
                    }
                }
            }

            players[i].score = {
                avg: 100 * score / (players.length - 1) / iterations,
                min: 100 * min / iterations,
                max: 100 * max / iterations
            };
        }

        if (players.length == 2) {
            players[1].score.avg = 100 - players[0].score.avg,
            players[1].score.min = players[1].score.avg;
            players[1].score.max = players[1].score.avg;
        }
    }

    // Fight 1vAl only
    simulateMultiple (player, players, iterations = 100000) {
        var scores = [];
        for (var i = 0; i < player.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            for (var j = 0; j < players.length; j++) {
                if (player[i].index != players[j].index) {
                    var s = 0;
                    this.cache(player[i].player, players[j].player);
                    for (var k = 0; k < iterations; k++) {
                        s += this.fight();
                    }

                    score += s;

                    if (s > max) {
                        max = s;
                    }

                    if (s < min) {
                        min = s;
                    }
                }
            }

            player[i].score = {
                avg: 100 * score / (players.length - 1) / iterations,
                min: 100 * min / iterations,
                max: 100 * max / iterations
            };
        }

        if (player.length == 2) {
            player[0].score.min = player[0].score.avg;
            player[0].score.max = player[0].score.avg;

            player[1].score.avg = 100 - player[0].score.avg,
            player[1].score.min = player[1].score.avg;
            player[1].score.max = player[1].score.avg;
        }
    }

    // Fight 1v1s only
    simulateSingle (player, players, iterations = 100000) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            this.cache(player.player, players[i].player);
            for (var j = 0; j < iterations; j++) {
                score += this.fight();
            }

            players[i].score = {
                avg: 100 * score / iterations,
                min: 100 * score / iterations,
                max: 100 * score / iterations
            }
        }
    }

    // Cache Players initially
    cache (source, target) {
        this.ca = FighterModel.create(0, source);
        this.cb = FighterModel.create(1, target);

        this.ca.initialize(this.cb);
        this.cb.initialize(this.ca);

        this.as = this.ca.onFightStart(this.cb);
        this.bs = this.cb.onFightStart(this.ca);
    }

    // Fight
    fight () {
        // Create fighters
        this.a = this.ca;
        this.b = this.cb;

        this.a.Health = this.a.TotalHealth;
        this.b.Health = this.b.TotalHealth;

        // Turn counter
        this.turn = 0;

        // Apply special damage
        if (this.as !== false || this.bs !== false) {
            this.turn++;

            if (this.as > 0) {
                this.b.Health -= this.as;
            }

            if (this.bs > 0) {
                this.a.Health -= this.bs;
            }
        }

        // Decide who starts first
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        // Simulation
        while (this.a.Health > 0 && this.b.Health > 0) {
            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                if (!this.b.onDamageTaken(this.a, damage)) {
                    break;
                }
            } else {
                this.b.Health -= damage;
                if (this.b.Health <= 0) {
                    break;
                }
            }

            if (this.a.Weapon2) {
                var damage2 = this.attack(this.a, this.b, this.a.Weapon2);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    if (!this.b.onDamageTaken(this.a, damage2)) {
                        break;
                    }
                } else {
                    this.b.Health -= damage2;
                    if (this.b.Health <= 0) {
                        break;
                    }
                }
            }

            if (this.a.RoundEnded) {
                this.a.onRoundEnded(() => {
                    this.turn++;

                    var damage3 = this.attack(this.a, this.b);
                    if (this.a.DamageDealt) {
                        this.a.onDamageDealt(this.b, damage3);
                    }

                    if (this.b.DamageTaken) {
                        return this.b.onDamageTaken(this.a, damage3);
                    } else {
                        this.b.Health -= damage3;
                        return this.b.Health >= 0
                    }
                });
            }

            [this.a, this.b] = [this.b, this.a];

            if (this.turn > 100) break;
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }

    // Attack
    attack (source, target, weapon = source.Weapon1) {
        // Rage
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        // Test for skip
        if (!getRandom(target.SkipChance)) {
            var damage = rage * (Math.random() * (1 + weapon.Range.Max - weapon.Range.Min) + weapon.Range.Min);
            if (getRandom(source.CriticalChance)) {
                damage *= weapon.Critical;
            }

            return Math.ceil(damage)
        } else {
            return 0;
        }
    }
}