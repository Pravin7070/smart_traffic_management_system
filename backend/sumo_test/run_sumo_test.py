import json
import os
import random
import shutil
import subprocess
import sys
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path


HERE = Path(__file__).resolve().parent
CFG_PATH = HERE / "intersection.sumocfg"
NET_PATH = HERE / "network.net.xml"
PROFILES_PATH = HERE / "behavior_profiles.json"
EVENTS_PATH = HERE / "events.json"
FRONTEND_EVENTS_PATH = HERE.parent.parent / "frontend" / "sumo" / "events.json"


def require_sumo_home():
    if "SUMO_HOME" not in os.environ:
        raise RuntimeError("SUMO_HOME is not set. Please install SUMO and set SUMO_HOME.")
    tools = Path(os.environ["SUMO_HOME"]) / "tools"
    if str(tools) not in sys.path:
        sys.path.append(str(tools))


def has_sumo_environment():
    if "SUMO_HOME" not in os.environ:
        return False
    try:
        subprocess.run(["sumo", "--version"], check=False, capture_output=True, text=True)
        subprocess.run(["netgenerate", "--version"], check=False, capture_output=True, text=True)
        return True
    except Exception:
        return False


def ensure_network():
    if NET_PATH.exists():
        return

    cmd = [
        "netgenerate",
        "--spider",
        "--spider.arm-number", "4",
        "--spider.circle-number", "1",
        "--spider.space-radius", "200",
        "--tls.guess", "true",
        "-o", str(NET_PATH)
    ]
    subprocess.run(cmd, check=True)


def load_profiles():
    with open(PROFILES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def weighted_profile_choice(profiles):
    p = profiles["spawn"]
    r = random.random()
    cum = 0.0
    for k in ["normal", "aggressive", "rule_breaker"]:
        cum += p[k]
        if r <= cum:
            return k
    return "normal"


def char_to_signal_state(ch):
    if ch in ("G", "g"):
        return "green"
    if ch in ("y", "Y"):
        return "yellow"
    if ch in ("r", "R"):
        return "red"
    return "unknown"


def timestamp_now():
    return datetime.now(timezone.utc).isoformat()


def write_events(step, events):
    payload = {
        "updated_at": timestamp_now(),
        "step": step,
        "events": list(events)
    }
    EVENTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    FRONTEND_EVENTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def append_event(events, event_type, data):
    evt = {
        "id": f"{event_type}-{random.randint(100000, 999999)}-{int(datetime.now(timezone.utc).timestamp())}",
        "type": event_type,
        "time": timestamp_now(),
    }
    evt.update(data)
    events.append(evt)


def synthetic_signal_state(step):
    mod = step % 30
    if mod < 10:
        return "green"
    if mod < 15:
        return "yellow"
    return "red"


def run_synthetic_fallback():
    profiles = load_profiles()
    events = deque(maxlen=1000)
    step = 0
    dirs = ["north", "south", "east", "west"]

    print("[SUMO TEST] Running synthetic fallback mode (no SUMO detected).")
    write_events(step, events)

    while step < 200000:
        step += 1
        state = synthetic_signal_state(step)
        state_map = {
            "north": state,
            "south": state,
            "east": "red" if state == "green" else ("yellow" if state == "yellow" else "green"),
            "west": "red" if state == "green" else ("yellow" if state == "yellow" else "green"),
        }

        # Continuous monitor heartbeat
        append_event(events, "monitor_status", {
            "vehicle_id": "",
            "time": step,
            "lane": "",
            "direction": "system",
            "signal_state": state,
            "signal_map": state_map,
            "active_vehicles": random.randint(18, 70)
        })

        # Frequent violations
        if step % 3 == 0:
            direction = random.choice(dirs)
            profile = "aggressive" if random.random() < 0.55 else "rule_breaker"
            signal_state = state_map.get(direction, "red")
            if signal_state == "green":
                signal_state = "yellow" if random.random() < 0.6 else "red"
            append_event(events, "violation", {
                "vehicle_id": f"veh_{step}_{random.randint(100, 999)}",
                "time": step,
                "lane": f"{direction}_in_0",
                "direction": direction,
                "signal_state": signal_state,
                "profile": profile
            })

        # Congestion alerts
        if step % 7 == 0:
            direction = random.choices(dirs, weights=[0.55, 0.15, 0.15, 0.15], k=1)[0]
            append_event(events, "congestion_alert", {
                "vehicle_id": "",
                "time": step,
                "lane": f"{direction}_in_0",
                "direction": direction,
                "signal_state": "unknown",
                "occupancy": round(random.uniform(0.35, 0.9), 3),
                "mean_speed": round(random.uniform(0.1, profiles["congestion"]["speed_threshold"]), 2)
            })

        # Accident alerts
        if step % 17 == 0:
            direction = random.choice(dirs)
            append_event(events, "accident_alert", {
                "vehicle_id": f"veh_stall_{step}_{random.randint(10, 99)}",
                "time": step,
                "lane": f"{direction}_in_1",
                "direction": direction,
                "signal_state": "unknown",
                "speed": 0.0
            })

        write_events(step, events)
        time.sleep(1)


def build_incoming_maps(traci, tls_id):
    controlled_lanes = traci.trafficlight.getControlledLanes(tls_id)
    incoming_edges = sorted({lane.split("_")[0] for lane in controlled_lanes})

    controlled_links = traci.trafficlight.getControlledLinks(tls_id)
    edge_to_out = defaultdict(set)
    for signal_links in controlled_links:
        for link in signal_links:
            if not link:
                continue
            in_lane, out_lane = link[0], link[1]
            in_edge = in_lane.split("_")[0]
            out_edge = out_lane.split("_")[0]
            edge_to_out[in_edge].add(out_edge)

    edge_to_out = {k: sorted(v) for k, v in edge_to_out.items()}
    return incoming_edges, edge_to_out


def pick_congestion_edge(incoming_edges):
    # Use first edge as high-pressure approach for deterministic congestion.
    return incoming_edges[0] if incoming_edges else None


def get_direction_from_lane_shape(traci, lane_id):
    shape = traci.lane.getShape(lane_id)
    if len(shape) < 2:
        return "unknown"
    x0, y0 = shape[0]
    x1, y1 = shape[-1]
    dx = x1 - x0
    dy = y1 - y0
    if abs(dx) > abs(dy):
        return "west_to_east" if dx > 0 else "east_to_west"
    return "south_to_north" if dy > 0 else "north_to_south"


def to_project_direction(shape_direction):
    if shape_direction == "north_to_south":
        return "north"
    if shape_direction == "south_to_north":
        return "south"
    if shape_direction == "east_to_west":
        return "east"
    if shape_direction == "west_to_east":
        return "west"
    return "unknown"


def get_project_direction(traci, lane_id):
    return to_project_direction(get_direction_from_lane_shape(traci, lane_id))


def project_tls_state_map(state):
    if not state or len(state) < 8:
        return {"north": "unknown", "south": "unknown", "east": "unknown", "west": "unknown"}
    return {
        "north": char_to_signal_state(state[0]),
        "south": char_to_signal_state(state[2]),
        "east": char_to_signal_state(state[4]),
        "west": char_to_signal_state(state[6]),
    }


def axis_of_direction(direction):
    if direction in ("north", "south"):
        return "ns"
    if direction in ("east", "west"):
        return "ew"
    return "unknown"


def build_tls_control_maps(traci, tls_id):
    controlled_links = traci.trafficlight.getControlledLinks(tls_id)
    signal_index_to_direction = {}
    incoming_lanes_by_direction = defaultdict(set)

    for idx, signal_links in enumerate(controlled_links):
        for link in signal_links:
            if not link:
                continue
            in_lane = link[0]
            direction = get_project_direction(traci, in_lane)
            signal_index_to_direction[idx] = direction
            incoming_lanes_by_direction[direction].add(in_lane)
            break

    incoming_lanes_by_direction = {
        d: sorted(list(lanes)) for d, lanes in incoming_lanes_by_direction.items()
    }
    return controlled_links, signal_index_to_direction, incoming_lanes_by_direction


def build_axis_signal_states(signal_index_to_direction, signal_count):
    ns_green = ["r"] * signal_count
    ns_yellow = ["r"] * signal_count
    ew_green = ["r"] * signal_count
    ew_yellow = ["r"] * signal_count

    for idx, direction in signal_index_to_direction.items():
        axis = axis_of_direction(direction)
        if axis == "ns":
            ns_green[idx] = "G"
            ns_yellow[idx] = "y"
        elif axis == "ew":
            ew_green[idx] = "G"
            ew_yellow[idx] = "y"

    all_red = ["r"] * signal_count
    return {
        "ns_green": "".join(ns_green),
        "ns_yellow": "".join(ns_yellow),
        "ew_green": "".join(ew_green),
        "ew_yellow": "".join(ew_yellow),
        "all_red": "".join(all_red),
    }


def estimate_axis_pressure(traci, incoming_lanes_by_direction):
    pressure = {"ns": 0.0, "ew": 0.0}
    for direction, lanes in incoming_lanes_by_direction.items():
        axis = axis_of_direction(direction)
        if axis not in pressure:
            continue
        for lane_id in lanes:
            vehicle_num = traci.lane.getLastStepVehicleNumber(lane_id)
            halting_num = traci.lane.getLastStepHaltingNumber(lane_id)
            occupancy = traci.lane.getLastStepOccupancy(lane_id) / 100.0
            pressure[axis] += vehicle_num + halting_num * 1.8 + occupancy * 4.0
    return pressure


def get_vehicle_next_out_lane(traci, veh_id, next_tls_entry, controlled_links):
    _tls, signal_index, _dist, _state = next_tls_entry
    try:
        links = controlled_links[signal_index]
    except Exception:
        return None

    current_lane = traci.vehicle.getLaneID(veh_id)
    for link in links:
        if not link:
            continue
        in_lane, out_lane = link[0], link[1]
        if in_lane == current_lane:
            return out_lane

    for link in links:
        if link:
            return link[1]
    return None


def is_exit_lane_clear(traci, out_lane):
    if not out_lane:
        return True, {"occupancy": 0.0, "free_space": 999.0}

    occupancy = traci.lane.getLastStepOccupancy(out_lane) / 100.0
    lane_length = max(1.0, traci.lane.getLength(out_lane))
    vehicle_num = traci.lane.getLastStepVehicleNumber(out_lane)
    halting_num = traci.lane.getLastStepHaltingNumber(out_lane)
    mean_speed = traci.lane.getLastStepMeanSpeed(out_lane)
    free_space = lane_length * (1.0 - occupancy)

    blocked = False
    if occupancy >= 0.72:
        blocked = True
    if free_space < 20.0:
        blocked = True
    if vehicle_num >= 3 and halting_num >= 2 and mean_speed < 1.2:
        blocked = True

    return (not blocked), {
        "occupancy": occupancy,
        "free_space": free_space,
        "vehicle_num": vehicle_num,
        "halting_num": halting_num,
        "mean_speed": mean_speed,
    }


def set_tls_axis_state(traci, tls_id, axis_states, axis, phase):
    key = f"{axis}_{phase}" if phase in ("green", "yellow") else "all_red"
    if phase == "allred":
        key = "all_red"
    state = axis_states.get(key, axis_states["all_red"])
    traci.trafficlight.setRedYellowGreenState(tls_id, state)
    return state


def maybe_spawn_vehicle(traci, edge_to_out, incoming_edges, profiles, step, congestion_edge):
    # Base spawn chance every simulation step
    spawn_attempts = 1

    # Artificial congestion: boost one direction continuously
    if congestion_edge:
        spawn_attempts += profiles["congestion"]["extra_spawns_per_step"]

    for i in range(spawn_attempts):
        if random.random() > 0.78 and i == 0:
            continue

        if i > 0 and congestion_edge:
            in_edge = congestion_edge
        else:
            in_edge = random.choice(incoming_edges)

        out_candidates = edge_to_out.get(in_edge, [])
        if not out_candidates:
            continue

        out_edge = random.choice(out_candidates)
        if out_edge == in_edge:
            continue

        route_id = f"r_{in_edge}_{out_edge}"
        if route_id not in traci.route.getIDList():
            traci.route.add(route_id, [in_edge, out_edge])

        profile = weighted_profile_choice(profiles)
        veh_id = f"veh_{step}_{i}_{random.randint(1000, 9999)}"

        try:
            traci.vehicle.add(veh_id, route_id, typeID=profile, depart="now")
            traci.vehicle.setColor(
                veh_id,
                (0, 160, 255, 255) if profile == "normal" else
                (255, 140, 0, 255) if profile == "aggressive" else
                (255, 50, 50, 255)
            )
            traci.vehicle.setParameter(veh_id, "enforcement.profile", profile)
        except Exception:
            # Ignore insertion failures due to full lane, keep simulation running.
            continue


def run():
    require_sumo_home()
    ensure_network()

    import traci
    import sumolib

    profiles = load_profiles()

    sumo_binary = sumolib.checkBinary("sumo")
    traci.start([
        sumo_binary,
        "-c", str(CFG_PATH),
        "--start",
        "--quit-on-end", "false"
    ])

    events = deque(maxlen=1000)

    tls_ids = traci.trafficlight.getIDList()
    if not tls_ids:
        raise RuntimeError("No traffic light found in generated network.")
    tls_id = tls_ids[0]

    incoming_edges, edge_to_out = build_incoming_maps(traci, tls_id)
    if not incoming_edges:
        raise RuntimeError("No incoming edges connected to traffic light.")

    controlled_links, signal_index_to_direction, incoming_lanes_by_direction = build_tls_control_maps(traci, tls_id)
    axis_states = build_axis_signal_states(signal_index_to_direction, len(controlled_links))

    congestion_edge = pick_congestion_edge(incoming_edges)

    last_tls_dist = {}
    last_tls_state = {}
    stopped_duration = defaultdict(float)
    lane_slow_duration = defaultdict(float)
    vehicle_override_until = {}
    junction_stuck_duration = defaultdict(float)

    # Conflict-free right-of-way controller (NS/EW only)
    phase_axis = "ns"
    phase = "green"
    phase_timer = 0.0
    min_green = 8.0
    max_green = 26.0
    yellow_dur = 3.0
    all_red_dur = 1.0

    # Deadlock recovery controller
    recovery_active = False
    recovery_until = 0
    entry_block_until = 0
    priority_axis = "ns"
    recent_hold_counts = defaultdict(int)

    step = 0
    set_tls_axis_state(traci, tls_id, axis_states, phase_axis, phase)
    write_events(step, events)

    while step < 200000:
        traci.simulationStep()
        step += 1

        # During initial deadlock recovery hold window, avoid feeding new traffic.
        if not (recovery_active and step <= entry_block_until):
            maybe_spawn_vehicle(traci, edge_to_out, incoming_edges, profiles, step, congestion_edge)

        veh_ids = traci.vehicle.getIDList()
        seen = set(veh_ids)

        # DEADLOCK DETECTION: vehicles on internal junction lanes with near-zero speed.
        stuck_vehicles = []
        for veh_id in veh_ids:
            lane_id = traci.vehicle.getLaneID(veh_id)
            speed = traci.vehicle.getSpeed(veh_id)
            if lane_id.startswith(":"):
                if speed < 0.15:
                    junction_stuck_duration[veh_id] += 1.0
                else:
                    junction_stuck_duration[veh_id] = 0.0
                if junction_stuck_duration[veh_id] >= 8.0:
                    stuck_vehicles.append(veh_id)
            else:
                junction_stuck_duration.pop(veh_id, None)

        if len(stuck_vehicles) >= 2 and not recovery_active:
            recovery_active = True
            recovery_until = step + 34
            entry_block_until = step + 8

            pressure = estimate_axis_pressure(traci, incoming_lanes_by_direction)
            priority_axis = "ns" if pressure["ns"] >= pressure["ew"] else "ew"
            phase_axis = priority_axis
            phase = "green"
            phase_timer = 0.0

            stuck_snap = []
            for vid in stuck_vehicles[:4]:
                x, y = traci.vehicle.getPosition(vid)
                stuck_snap.append({"vehicle_id": vid, "x": round(x, 1), "y": round(y, 1)})

            append_event(events, "deadlock_recovery", {
                "time": step,
                "direction": "system",
                "signal_state": "recovery",
                "stuck_count": len(stuck_vehicles),
                "priority_axis": priority_axis,
                "entry_block_seconds": 8,
                "sample": stuck_snap,
            })

        if recovery_active and step > recovery_until:
            recovery_active = False
            entry_block_until = 0

        # RIGHT-OF-WAY CONTROL: allow only non-conflicting axis at a time.
        phase_timer += 1.0
        pressure = estimate_axis_pressure(traci, incoming_lanes_by_direction)
        current_axis = phase_axis
        other_axis = "ew" if current_axis == "ns" else "ns"

        if phase == "green":
            switch_threshold = 1.6 if recovery_active else 1.3
            if phase_timer >= max_green or (
                phase_timer >= min_green and pressure[other_axis] > max(2.0, pressure[current_axis] * switch_threshold)
            ):
                phase = "yellow"
                phase_timer = 0.0
        elif phase == "yellow":
            if phase_timer >= yellow_dur:
                phase = "allred"
                phase_timer = 0.0
        else:  # all red
            if phase_timer >= all_red_dur:
                if recovery_active:
                    phase_axis = priority_axis
                else:
                    phase_axis = "ns" if pressure["ns"] >= pressure["ew"] else "ew"
                phase = "green"
                phase_timer = 0.0

        tls_state = set_tls_axis_state(traci, tls_id, axis_states, phase_axis, phase)

        # Gradual release budget during recovery: avoid re-blocking immediately.
        admissions_left = 9999
        if recovery_active:
            if step <= entry_block_until:
                admissions_left = 0
            else:
                admissions_left = 2

        recent_hold_counts.clear()

        for veh_id in veh_ids:
            profile = traci.vehicle.getParameter(veh_id, "enforcement.profile") or traci.vehicle.getTypeID(veh_id)
            speed = traci.vehicle.getSpeed(veh_id)

            next_tls = traci.vehicle.getNextTLS(veh_id)
            if next_tls:
                _tls, _index, dist, state = next_tls[0]
                prev_dist = last_tls_dist.get(veh_id, dist)
                prev_state = last_tls_state.get(veh_id, state)

                lane_id = traci.vehicle.getLaneID(veh_id)
                direction = get_project_direction(traci, lane_id)
                axis = axis_of_direction(direction)
                out_lane = get_vehicle_next_out_lane(traci, veh_id, next_tls[0], controlled_links)
                exit_clear, _exit_meta = is_exit_lane_clear(traci, out_lane)

                # Junction blocking prevention + staged admission.
                hold_vehicle = False
                if 0 < dist < 38:
                    if recovery_active and step <= entry_block_until:
                        hold_vehicle = True
                    elif recovery_active and axis != priority_axis:
                        hold_vehicle = True
                    elif phase != "green" or axis != phase_axis:
                        hold_vehicle = True
                    elif not exit_clear:
                        hold_vehicle = True
                    elif admissions_left <= 0:
                        hold_vehicle = True
                    else:
                        admissions_left -= 1

                if hold_vehicle:
                    traci.vehicle.setSpeedMode(veh_id, 31)
                    traci.vehicle.setSpeed(veh_id, 0.0)
                    recent_hold_counts[direction] += 1
                elif veh_id not in vehicle_override_until:
                    # Give control back to SUMO car-following when no manual hold is required.
                    traci.vehicle.setSpeed(veh_id, -1)

                # Intentional abnormal behavior near junction.
                if dist < 35 and profile in ("aggressive", "rule_breaker") and not hold_vehicle:
                    chance = profiles["violation_chance"]["aggressive" if profile == "aggressive" else "rule_breaker"]
                    if state in ("r", "R", "y", "Y") and random.random() < chance:
                        traci.vehicle.setSpeedMode(veh_id, 0)
                        traci.vehicle.setSpeed(veh_id, max(13.0, speed))
                        vehicle_override_until[veh_id] = step + 8

                # Restore normal speed control after override window.
                if veh_id in vehicle_override_until and step > vehicle_override_until[veh_id]:
                    traci.vehicle.setSpeedMode(veh_id, 31)
                    vehicle_override_until.pop(veh_id, None)

                # Violation detection: crossed stop line while not green.
                crossed = prev_dist > 0 and dist <= 0
                signal_state = char_to_signal_state(prev_state)
                if crossed and signal_state in ("red", "yellow"):
                    append_event(events, "violation", {
                        "vehicle_id": veh_id,
                        "time": step,
                        "lane": lane_id,
                        "direction": direction,
                        "signal_state": signal_state,
                        "profile": profile
                    })

                last_tls_dist[veh_id] = dist
                last_tls_state[veh_id] = state

            # Accident/abnormal stopped vehicle detection.
            if speed <= profiles["accident"]["stopped_speed_threshold"]:
                stopped_duration[veh_id] += 1.0
                if stopped_duration[veh_id] in (profiles["accident"]["duration_sec"], profiles["accident"]["duration_sec"] + 1):
                    lane_id = traci.vehicle.getLaneID(veh_id)
                    append_event(events, "accident_alert", {
                        "vehicle_id": veh_id,
                        "time": step,
                        "lane": lane_id,
                        "direction": get_project_direction(traci, lane_id),
                        "signal_state": "unknown",
                        "speed": round(speed, 2)
                    })
            else:
                stopped_duration[veh_id] = 0.0

        # Cleanup stale vehicle trackers.
        for vid in list(last_tls_dist.keys()):
            if vid not in seen:
                last_tls_dist.pop(vid, None)
                last_tls_state.pop(vid, None)
                stopped_duration.pop(vid, None)
                vehicle_override_until.pop(vid, None)
                junction_stuck_duration.pop(vid, None)

        # Congestion monitoring from lane occupancy + speed.
        for lane_id in traci.lane.getIDList():
            if lane_id.startswith(":"):
                continue
            occ = traci.lane.getLastStepOccupancy(lane_id) / 100.0
            mean_speed = traci.lane.getLastStepMeanSpeed(lane_id)
            if occ > 0.32 and mean_speed < profiles["congestion"]["speed_threshold"]:
                lane_slow_duration[lane_id] += 1.0
            else:
                lane_slow_duration[lane_id] = max(0.0, lane_slow_duration[lane_id] - 2.0)

            if lane_slow_duration[lane_id] in (
                profiles["congestion"]["duration_sec"],
                profiles["congestion"]["duration_sec"] + 1,
            ):
                append_event(events, "congestion_alert", {
                    "vehicle_id": "",
                    "time": step,
                    "lane": lane_id,
                    "direction": get_project_direction(traci, lane_id),
                    "signal_state": "unknown",
                    "occupancy": round(occ, 3),
                    "mean_speed": round(mean_speed, 2)
                })

        # Keep dashboard fed even during quieter periods.
        if step % 20 == 0:
            append_event(events, "monitor_status", {
                "vehicle_id": "",
                "time": step,
                "lane": "",
                "direction": "system",
                "signal_state": tls_state,
                "signal_map": project_tls_state_map(tls_state),
                "active_vehicles": len(veh_ids),
                "recovery_active": recovery_active,
                "priority_axis": priority_axis if recovery_active else "none",
                "held_north": recent_hold_counts.get("north", 0),
                "held_south": recent_hold_counts.get("south", 0),
                "held_east": recent_hold_counts.get("east", 0),
                "held_west": recent_hold_counts.get("west", 0),
            })

        if step % 2 == 0:
            write_events(step, events)

    traci.close()


if __name__ == "__main__":
    random.seed(7)
    if has_sumo_environment():
        try:
            run()
        except Exception as exc:
            print(f"[SUMO TEST] SUMO mode failed, switching to synthetic fallback: {exc}")
            run_synthetic_fallback()
    else:
        run_synthetic_fallback()
