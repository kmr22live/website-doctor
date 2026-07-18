/** Fixed radial-gradient wash + faint grid, from the design contract. */
export function Background() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 520px at 12% -8%, rgba(167,139,250,0.18), transparent 62%), radial-gradient(1100px 640px at 92% 112%, rgba(45,212,191,0.14), transparent 60%), radial-gradient(700px 400px at 55% 50%, rgba(59,130,246,0.07), transparent 65%)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.5,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </>
  );
}
