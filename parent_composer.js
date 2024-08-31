/*jslint node: true */
"use strict";
var _ = require('lodash');
var db = require('./db.js');
var constants = require("./constants.js");
var conf = require("./conf.js");
var storage = require("./storage.js");
var main_chain = require("./main_chain.js");
var graph = require('./graph.js');

const bAdvanceLastStableUnit = true;

function pickParentUnits(conn, arrWitnesses, timestamp, onDone){
	// don't exclude units derived from unwitnessed potentially bad units! It is not their blame and can cause a split.
	
	// test creating bad units
	//var cond = bDeep ? "is_on_main_chain=1" : "is_free=0 AND main_chain_index=1420";
	//var order_and_limit = bDeep ? "ORDER BY main_chain_index DESC LIMIT 1" : "ORDER BY unit LIMIT 1";
	
	var bWithTimestamp = (storage.getMinRetrievableMci() >= constants.timestampUpgradeMci);
	var ts_cond = bWithTimestamp ? "AND timestamp<=" + timestamp : '';
	conn.query(
		"SELECT \n\
			unit, version, alt, ( \n\
				SELECT COUNT(*) \n\
				FROM unit_witnesses \n\
				WHERE unit_witnesses.unit IN(units.unit, units.witness_list_unit) AND address IN(?) \n\
			) AS count_matching_witnesses \n\
		FROM units "+(conf.storage === 'sqlite' ? "INDEXED BY byFree" : "")+" \n\
		LEFT JOIN archived_joints USING(unit) \n\
		WHERE +sequence='good' AND is_free=1 AND archived_joints.unit IS NULL "+ts_cond+" ORDER BY unit", 
		// exclude potential parents that were archived and then received again
		[arrWitnesses], 
		function(rows){
			if (rows.some(function(row){ return (constants.supported_versions.indexOf(row.version) == -1 || row.alt !== constants.alt); }))
				throw Error('wrong network');
			var count_required_matches = constants.COUNT_WITNESSES - constants.MAX_WITNESS_LIST_MUTATIONS;
			// we need at least one compatible parent, otherwise go deep
			if (rows.filter(function(row){ return (row.count_matching_witnesses >= count_required_matches); }).length === 0)
				return pickDeepParentUnits(conn, arrWitnesses, timestamp, null, onDone);
			var arrParentUnits = rows.map(function(row){ return row.unit; });
			adjustParentsToNotRetreatWitnessedLevel(conn, arrWitnesses, arrParentUnits, function(err, arrAdjustedParents, max_parent_wl){
				onDone(err, arrAdjustedParents, max_parent_wl);
			});
		//	checkWitnessedLevelNotRetreatingAndLookLower(conn, arrWitnesses, arrParentUnits, (arrParentUnits.length === 1), onDone);
		}
	);
}

function adjustParentsToNotRetreatWitnessedLevel(conn, arrWitnesses, arrParentUnits, handleAdjustedParents){
	var arrExcludedUnits = [];
	var iterations = 0;
	
	function replaceExcludedParent(arrCurrentParentUnits, excluded_unit){
		console.log('replaceExcludedParent '+arrCurrentParentUnits.join(', ')+" excluding "+excluded_unit);
		if (!excluded_unit)
			throw Error("no excluded unit");
		var arrNewExcludedUnits = [excluded_unit];
		console.log('excluded parents: '+arrNewExcludedUnits.join(', '));
		arrExcludedUnits = arrExcludedUnits.concat(arrNewExcludedUnits);
		var arrParentsToKeep = _.difference(arrCurrentParentUnits, arrNewExcludedUnits);
		conn.query("SELECT DISTINCT parent_unit FROM parenthoods WHERE child_unit IN(?)", [arrNewExcludedUnits], function(rows){
			var arrCandidateReplacements = rows.map(function(row){ return row.parent_unit; });
			console.log('candidate replacements: '+arrCandidateReplacements.join(', '));
			conn.query(
				"SELECT DISTINCT parent_unit FROM parenthoods CROSS JOIN units ON child_unit=unit \n\
				WHERE parent_unit IN(?) AND child_unit NOT IN("+arrExcludedUnits.map(db.escape).join(', ')+") AND (is_free=0 OR sequence='good')", 
				[arrCandidateReplacements], 
				function(rows){
					// other children can lead to some of the non-excluded parents
					var arrCandidatesWithOtherChildren = rows.map(function(row){ return row.parent_unit; });
					console.log('candidates with other children: '+arrCandidatesWithOtherChildren.join(', '));
					var arrReplacementParents = _.difference(arrCandidateReplacements, arrCandidatesWithOtherChildren);
					console.log('replacements for excluded parents: '+arrReplacementParents.join(', '));
					var arrNewParents = arrParentsToKeep.concat(arrReplacementParents);
					console.log('new parents: '+arrNewParents.join(', '));
					if (arrNewParents.length === 0)
						throw Error("no new parents for initial parents "+arrParentUnits.join(', ')+", current parents "+arrCurrentParentUnits.join(', ')+", excluded unit "+excluded_unit+", excluded units "+arrExcludedUnits.join(', ')+", and witnesses "+arrWitnesses.join(', '));
					checkWitnessedLevelAndReplace(arrNewParents);
				}
			);
		});
	}
	
	function checkWitnessedLevelAndReplace(arrCurrentParentUnits){
		console.log('checkWitnessedLevelAndReplace '+arrCurrentParentUnits.join(', '));
		if (iterations > 0 && arrExcludedUnits.length === 0)
			throw Error("infinite cycle");
		if (iterations >= conf.MAX_PARENT_DEPTH)
			return handleAdjustedParents("failed to find suitable parents after " + iterations + " attempts, please check that your order provider list is updated.");
		iterations++;
		determineWitnessedLevels(conn, arrWitnesses, arrCurrentParentUnits, function(child_witnessed_level, max_parent_wl, parent_with_max_wl, best_parent_unit){
			if (child_witnessed_level >= max_parent_wl && best_parent_unit){
				if (arrCurrentParentUnits.length <= constants.MAX_PARENTS_PER_UNIT)
					return handleAdjustedParents(null, arrCurrentParentUnits.sort(), max_parent_wl);
				var bp_index = arrCurrentParentUnits.indexOf(best_parent_unit);
				if (bp_index < 0)
					throw Error("best parent "+best_parent_unit+" not found among parents "+arrCurrentParentUnits.join(', '));
				arrCurrentParentUnits.splice(bp_index, 1);
				arrCurrentParentUnits.unshift(best_parent_unit); // moves best_parent_unit to the 1st position to make sure it is not sliced off
				return handleAdjustedParents(null, arrCurrentParentUnits.slice(0, constants.MAX_PARENTS_PER_UNIT).sort(), max_parent_wl);
			}
			var msg = best_parent_unit ? 'wl would retreat from '+max_parent_wl+' to '+child_witnessed_level : 'no best parent'
			console.log(msg+', parents '+arrCurrentParentUnits.join(', '));
			replaceExcludedParent(arrCurrentParentUnits, parent_with_max_wl);
		});
	}
	
	checkWitnessedLevelAndReplace(arrParentUnits);
}

function pickParentUnitsUnderWitnessedLevel(conn, arrWitnesses, timestamp, max_wl, onDone){
	console.log("looking for free parents under wl "+max_wl);
	var bWithTimestamp = (storage.getMinRetrievableMci() >= constants.timestampUpgradeMci);
	var ts_cond = bWithTimestamp ? "AND timestamp<=" + timestamp : '';
	conn.query(
		"SELECT unit \n\
		FROM units "+(conf.storage === 'sqlite' ? "INDEXED BY byFree" : "")+" \n\
		WHERE +sequence='good' AND is_free=1 AND witnessed_level<? "+ts_cond+" \n\
			AND ( \n\
				SELECT COUNT(*) \n\
				FROM unit_witnesses \n\
				WHERE unit_witnesses.unit IN(units.unit, units.witness_list_unit) AND address IN(?) \n\
			)>=? \n\
		ORDER BY witnessed_level DESC, level DESC LIMIT ?", 
		[max_wl, arrWitnesses, constants.COUNT_WITNESSES - constants.MAX_WITNESS_LIST_MUTATIONS, constants.MAX_PARENTS_PER_UNIT], 
		function(rows){
			if (rows.length === 0)
				return pickDeepParentUnits(conn, arrWitnesses, timestamp, max_wl, onDone);
			var arrParentUnits = rows.map(function(row){ return row.unit; }).sort();
			checkWitnessedLevelNotRetreatingAndLookLower(conn, arrWitnesses, timestamp, arrParentUnits, true, onDone);
		}
	);
}

// if we failed to find compatible parents among free units. 
// (This may be the case if an attacker floods the network trying to shift the witness list)
function pickDeepParentUnits(conn, arrWitnesses, timestamp, max_wl, onDone){
	// fixed: an attacker could cover all free compatible units with his own incompatible ones, then those that were not on MC will be never included
	//var cond = bDeep ? "is_on_main_chain=1" : "is_free=1";
	
	console.log("looking for deep parents, max_wl="+max_wl);
	var and_wl = (max_wl === null) ? '' : "AND +is_on_main_chain=1 AND witnessed_level<"+max_wl;
	var bWithTimestamp = (storage.getMinRetrievableMci() >= constants.timestampUpgradeMci);
	var ts_cond = bWithTimestamp ? "AND timestamp<=" + timestamp : '';
	conn.query(
		"SELECT unit \n\
		FROM units \n\
		WHERE +sequence='good' "+and_wl+" "+ts_cond+" \n\
			AND ( \n\
				SELECT COUNT(*) \n\
				FROM unit_witnesses \n\
				WHERE unit_witnesses.unit IN(units.unit, units.witness_list_unit) AND address IN(?) \n\
			)>=? \n\
		ORDER BY latest_included_mc_index DESC LIMIT 1", 
		[arrWitnesses, constants.COUNT_WITNESSES - constants.MAX_WITNESS_LIST_MUTATIONS], 
		function(rows){
			if (rows.length === 0)
				return onDone("failed to find compatible parents: no deep units");
			var arrParentUnits = rows.map(function(row){ return row.unit; });
			console.log('found deep parents: ' + arrParentUnits.join(', '));
			checkWitnessedLevelNotRetreatingAndLookLower(conn, arrWitnesses, timestamp, arrParentUnits, true, onDone);
		}
	);
}

function determineWitnessedLevels(conn, arrWitnesses, arrParentUnits, handleResult){
	storage.determineWitnessedLevelAndBestParent(conn, arrParentUnits, arrWitnesses, function(witnessed_level, best_parent_unit){
		conn.query(
			"SELECT unit, witnessed_level FROM units WHERE unit IN(?) ORDER BY witnessed_level DESC LIMIT 1",
			[arrParentUnits],
			function (rows) {
				var max_parent_wl = rows[0].witnessed_level;
				var parent_with_max_wl = rows[0].unit;
				if (!best_parent_unit)
					return handleResult(witnessed_level, max_parent_wl, parent_with_max_wl);
				storage.readStaticUnitProps(conn, best_parent_unit, function(bestParentProps){
					if (bestParentProps.witnessed_level === max_parent_wl)
						parent_with_max_wl = best_parent_unit;
					handleResult(witnessed_level, max_parent_wl, parent_with_max_wl, best_parent_unit);
				});
			}
		);
	//	storage.readStaticUnitProps(conn, best_parent_unit, function(bestParentProps){
	//		handleResult(witnessed_level, bestParentProps.witnessed_level, best_parent_unit);
	//	});
	});
}

function checkWitnessedLevelNotRetreatingAndLookLower(conn, arrWitnesses, timestamp, arrParentUnits, bRetryDeeper, onDone){
	determineWitnessedLevels(conn, arrWitnesses, arrParentUnits, function(child_witnessed_level, max_parent_wl, parent_with_max_wl, best_parent_unit){
		if (child_witnessed_level >= max_parent_wl && best_parent_unit)
			return onDone(null, arrParentUnits, max_parent_wl);
		var msg = best_parent_unit ? "witness level would retreat from "+max_parent_wl+" to "+child_witnessed_level : "no best parent";
		console.log(msg + " if parents = " + arrParentUnits.join(', ') + ", will look for older parents");
		if (conf.bServeAsHub) // picking parents for someone else, give up early
			return onDone("failed to find parents: " + msg);
		bRetryDeeper
			? pickDeepParentUnits(conn, arrWitnesses, timestamp, max_parent_wl, onDone)
			: pickParentUnitsUnderWitnessedLevel(conn, arrWitnesses, timestamp, max_parent_wl, onDone);
	});
}

function findLastStableMcBall(conn, arrWitnesses, arrParentUnits, onDone) {
	storage.readMaxLastBallMci(conn, arrParentUnits, function (max_parent_last_ball_mci) {
		conn.query(
			"SELECT ball, unit, main_chain_index FROM units JOIN balls USING(unit) \n\
			WHERE is_on_main_chain=1 AND is_stable=1 AND +sequence='good' \n\
				AND main_chain_index" + (bAdvanceLastStableUnit ? '>=' : '=') + "? \n\
				AND main_chain_index<=IFNULL((SELECT MAX(latest_included_mc_index) FROM units WHERE unit IN(?)), 0) \n\
				AND ( \n\
					SELECT COUNT(*) \n\
					FROM unit_witnesses \n\
					WHERE unit_witnesses.unit IN(units.unit, units.witness_list_unit) AND address IN(?) \n\
				)>=? \n\
			ORDER BY main_chain_index DESC LIMIT 1",
			[max_parent_last_ball_mci, arrParentUnits,
			arrWitnesses, constants.COUNT_WITNESSES - constants.MAX_WITNESS_LIST_MUTATIONS],
			function (rows) {
				if (rows.length === 0)
					return onDone("failed to find last stable ball");
				console.log('last stable unit: ' + rows[0].unit);
				onDone(null, rows[0].ball, rows[0].unit, rows[0].main_chain_index);
			}
		);
	});
}

function adjustLastStableMcBallAndParents(conn, last_stable_mc_ball_unit, arrParentUnits, arrWitnesses, handleAdjustedLastStableUnit){
	main_chain.determineIfStableInLaterUnitsWithMaxLastBallMciFastPath(conn, last_stable_mc_ball_unit, arrParentUnits, function(bStable){
		console.log("stability of " + last_stable_mc_ball_unit + " in " + arrParentUnits.join(', ') + ": " + bStable);
		if (bStable) {
			conn.query("SELECT ball, main_chain_index FROM units JOIN balls USING(unit) WHERE unit=?", [last_stable_mc_ball_unit], function(rows){
				if (rows.length !== 1)
					throw Error("not 1 ball by unit "+last_stable_mc_ball_unit);
				var row = rows[0];
				handleAdjustedLastStableUnit(row.ball, last_stable_mc_ball_unit, row.main_chain_index, arrParentUnits);
			});
			return;
		}
		console.log('will adjust last stable ball because '+last_stable_mc_ball_unit+' is not stable in view of parents '+arrParentUnits.join(', '));
		/*if (arrParentUnits.length > 1){ // select only one parent
			pickDeepParentUnits(conn, arrWitnesses, null, function(err, arrAdjustedParentUnits){
				if (err)
					throw Error("pickDeepParentUnits in adjust failed: "+err);
				adjustLastStableMcBallAndParents(conn, last_stable_mc_ball_unit, arrAdjustedParentUnits, arrWitnesses, handleAdjustedLastStableUnit);
			});
			return;
		}*/
		storage.readStaticUnitProps(conn, last_stable_mc_ball_unit, function(objUnitProps){
			if (!objUnitProps.best_parent_unit)
				throw Error("no best parent of "+last_stable_mc_ball_unit);
			var next_last_ball_unit = objUnitProps.best_parent_unit;
			graph.determineIfIncluded(conn, next_last_ball_unit, arrParentUnits, function (bIncluded) {
				if (bIncluded)
					return adjustLastStableMcBallAndParents(conn, next_last_ball_unit, arrParentUnits, arrWitnesses, handleAdjustedLastStableUnit);
				console.log("last ball unit " + next_last_ball_unit + " not included in parents " + arrParentUnits.join(', '));
				conn.query(
					"SELECT lb_units.unit \n\
					FROM units AS p_units \n\
					CROSS JOIN units AS lb_units ON p_units.last_ball_unit=lb_units.unit \n\
					WHERE p_units.unit IN(?) \n\
					ORDER BY lb_units.main_chain_index DESC LIMIT 1",
					[arrParentUnits],
					function (rows) {
						next_last_ball_unit = rows[0].unit;
						adjustLastStableMcBallAndParents(conn, next_last_ball_unit, arrParentUnits, arrWitnesses, handleAdjustedLastStableUnit);
					}
				);
			});
		});
	});
}

function trimParentList(conn, arrParentUnits, last_stable_mci, arrWitnesses, handleTrimmedList) {
	if (arrParentUnits.length === 1)
		return handleTrimmedList(arrParentUnits);
	conn.query(
		"SELECT DISTINCT units.unit \n\
		FROM units \n\
		CROSS JOIN unit_authors USING(unit) \n\
		LEFT JOIN aa_addresses USING(address) \n\
		WHERE units.unit IN(" + arrParentUnits.map(db.escape).join(', ') + ") \n\
			AND (aa_addresses.address IS NULL OR latest_included_mc_index<=?) \n\
		ORDER BY (unit_authors.address IN(?)) DESC, " + db.getRandom() + " LIMIT ?",
		[last_stable_mci, arrWitnesses, constants.MAX_PARENTS_PER_UNIT],
		function (rows) {
			handleTrimmedList(rows.map(function (row) { return row.unit; }).sort());
		}
	);
}

function pickParentUnitsAndLastBall(conn, arrWitnesses, timestamp, onDone){

	var depth = 0;
	pickParentUnits(conn, arrWitnesses, timestamp, function(err, arrParentUnits, max_parent_wl){
		if (err)
			return onDone(err);
		findLastBallAndAdjust(conn, arrWitnesses, arrParentUnits, function(err,arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci){
			if (err) {
				console.log("initial findLastBallAndAdjust returned error: " + err + ", will pickParentsDeeper");
				return pickParentsDeeper(max_parent_wl)
			}
			onDone(null, arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci);
		})
	});

	function pickParentsDeeper(max_parent_wl){
		depth++;
		if (conf.MAX_PARENT_DEPTH && depth > conf.MAX_PARENT_DEPTH)
			return onDone("failed to pick parents after digging to depth " + depth + ", please check that your order provider list is updated.");
		pickDeepParentUnits(conn, arrWitnesses, timestamp, max_parent_wl, function (err, arrParentUnits, max_parent_wl) {
			if (err)
				return onDone(err);
			findLastBallAndAdjust(conn, arrWitnesses, arrParentUnits, function(err,arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci){
				if (err) {
					console.log("secondary findLastBallAndAdjust returned error: " + err + ", will pickParentsDeeper");
					return pickParentsDeeper(max_parent_wl);
				}
				onDone(null, arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci);
			});
		});
	}
}

function findLastBallAndAdjust(conn, arrWitnesses, arrParentUnits, onDone){

	findLastStableMcBall(conn, arrWitnesses, arrParentUnits, function(err, last_stable_mc_ball, last_stable_mc_ball_unit, last_stable_mc_ball_mci){
		if (err)
			return onDone(err);
		adjustLastStableMcBallAndParents(
			conn, last_stable_mc_ball_unit, arrParentUnits, arrWitnesses, 
			function(last_stable_ball, last_stable_unit, last_stable_mci, arrAdjustedParentUnits){
				trimParentList(conn, arrAdjustedParentUnits, last_stable_mci, arrWitnesses, function(arrTrimmedParentUnits){
					storage.findWitnessListUnit(conn, arrWitnesses, last_stable_mci, function(witness_list_unit){
						var objFakeUnit = {parent_units: arrTrimmedParentUnits};
						if (witness_list_unit)
							objFakeUnit.witness_list_unit = witness_list_unit;
						console.log('determineIfHasWitnessListMutationsAlongMc last_stable_unit '+last_stable_unit+', parents '+arrParentUnits.join(', '));
						storage.determineIfHasWitnessListMutationsAlongMc(conn, objFakeUnit, last_stable_unit, arrWitnesses, function(err){
							if (err)
								return onDone(err); // if first arg is not array, it is error
							onDone(null, arrTrimmedParentUnits, last_stable_ball, last_stable_unit, last_stable_mci);
						});
					});
				});
			}
		);
	});

}



exports.pickParentUnitsAndLastBall = pickParentUnitsAndLastBall;
