# Phase 1.6 Identity Reconciliation

Read-only report generated from canonical Supabase project `nysrxvpjdlvzvcawysvh`.

No insert, update, delete, schema, RLS, FK, authentication, broker, or market-data operation was performed.

## Auth -> public.users

- Auth users examined: 434
- public.users examined: 424
- Exact `public.users.id -> auth.users.id` matches: 0
- Unmatched public.users rows: 424
- public.users rows with at least one case-insensitive Auth email candidate: 405
- Duplicate public.users identity candidates: 0
- Duplicate public.users email groups: 0
- Duplicate Auth email groups: 0
- Auth email matches are candidate evidence only; they are never treated as identity confirmation.

## public.users -> terminal_traders

- Confirmed: 128
- Unresolved: 4
- Ambiguous: 0
- Orphaned: 0
- Unknown: 0

Confirmed mappings:
- `010527fd-1fbb-45f1-88b3-0a43f1a1ce40` -> external_id `c60b00eb-bf54-432f-b389-58767cfcadd6` -> public.users.id `c60b00eb-bf54-432f-b389-58767cfcadd6`
- `0a05f016-a575-4d84-86e2-7035e3a00b56` -> external_id `fb1354b3-454b-4529-8f7f-c0f0ae09ad57` -> public.users.id `fb1354b3-454b-4529-8f7f-c0f0ae09ad57`
- `0f47926a-8bf1-4961-b497-9804e244b2b0` -> external_id `2534af36-fd2e-42b4-bcae-2cd7f1d95044` -> public.users.id `2534af36-fd2e-42b4-bcae-2cd7f1d95044`
- `0f6c5649-54cf-4c75-8045-2fbc4db7b2e4` -> external_id `e5540287-ff6a-4390-8f2d-9db284595280` -> public.users.id `e5540287-ff6a-4390-8f2d-9db284595280`
- `11a0f4c6-d296-41f6-b7a3-df263ea96f99` -> external_id `1796b7ab-38d1-4ba4-a1c8-f11785696b78` -> public.users.id `1796b7ab-38d1-4ba4-a1c8-f11785696b78`
- `14a2cba6-d0f4-4f97-b6f9-051e3a8c82b1` -> external_id `586c4d72-2acb-4205-a560-cf532724c321` -> public.users.id `586c4d72-2acb-4205-a560-cf532724c321`
- `189b3c02-78d8-4a77-9a01-3ae70923093a` -> external_id `e3669df4-5b47-45a7-9cb5-a84672083b85` -> public.users.id `e3669df4-5b47-45a7-9cb5-a84672083b85`
- `1ba55f50-8713-4c88-8df0-722ab734c3aa` -> external_id `4acaf277-3eab-4904-ab6e-933e4f58c159` -> public.users.id `4acaf277-3eab-4904-ab6e-933e4f58c159`
- `1f887156-be11-4e60-b96f-92d292d50021` -> external_id `0e4fa82a-2d4a-4c1a-a7f9-d9e77fc6ebf2` -> public.users.id `0e4fa82a-2d4a-4c1a-a7f9-d9e77fc6ebf2`
- `222fe8e0-be22-497f-9f45-debc856be0d2` -> external_id `458e06f6-2b52-4612-8570-33bacf836864` -> public.users.id `458e06f6-2b52-4612-8570-33bacf836864`
- `27da5a51-5c6e-4e4c-8a8e-b6ea01a702f4` -> external_id `ef4b7f7f-1ae0-4894-9131-c3367d3e3f26` -> public.users.id `ef4b7f7f-1ae0-4894-9131-c3367d3e3f26`
- `28fa4c95-1dd7-4cdc-bd72-b2d68c853444` -> external_id `8f96f16d-b276-43c8-aba9-fc442209a548` -> public.users.id `8f96f16d-b276-43c8-aba9-fc442209a548`
- `294e603f-23af-4d8b-8f26-eb05caaf2295` -> external_id `699f3a02-59d0-4f23-a7d2-e920f28b3214` -> public.users.id `699f3a02-59d0-4f23-a7d2-e920f28b3214`
- `2aa99964-5342-4f20-8744-df7aba3a0981` -> external_id `dbb101ec-7340-4951-8dde-42c4688db83e` -> public.users.id `dbb101ec-7340-4951-8dde-42c4688db83e`
- `2c7d15d8-80fe-41e1-87dd-d864b422b57d` -> external_id `8812fb43-82e5-47ba-8b10-22c96fe07417` -> public.users.id `8812fb43-82e5-47ba-8b10-22c96fe07417`
- `2f06ca7f-8bbc-4390-b3d4-d6c6cc37f669` -> external_id `9676bffa-7c8d-45fe-ae95-cf836c7da974` -> public.users.id `9676bffa-7c8d-45fe-ae95-cf836c7da974`
- `30127bce-ce9a-4805-ae73-781ff3a130cc` -> external_id `5a25a829-a5a9-4ee9-a015-e0be1e181a23` -> public.users.id `5a25a829-a5a9-4ee9-a015-e0be1e181a23`
- `362851e8-e34a-4c41-a67e-8d9d54f555e0` -> external_id `2202cde7-591e-4ffa-90c2-138ecda7fcd5` -> public.users.id `2202cde7-591e-4ffa-90c2-138ecda7fcd5`
- `3844515b-1b88-45af-a1d1-fc52d6ff461a` -> external_id `22a2ea37-264b-44f3-bd8c-4e06ea4a8e8d` -> public.users.id `22a2ea37-264b-44f3-bd8c-4e06ea4a8e8d`
- `398a03af-9945-4841-9f9d-c14ad52e8331` -> external_id `c68d70cd-ad04-44ed-b7b1-6a9bcbc11348` -> public.users.id `c68d70cd-ad04-44ed-b7b1-6a9bcbc11348`
- `3a0afb92-f86f-48b4-9de5-d2ae54f66572` -> external_id `7708b504-d2db-46ea-9672-f504251ec6fa` -> public.users.id `7708b504-d2db-46ea-9672-f504251ec6fa`
- `3a953c35-8e46-4e58-b3a0-da6f2f89145c` -> external_id `e490465d-ac6d-4005-a12d-5fd5ea7a23f9` -> public.users.id `e490465d-ac6d-4005-a12d-5fd5ea7a23f9`
- `3bd820fe-35eb-4186-a1a0-3eb563ccfb92` -> external_id `f68a646d-97b5-443f-82dd-821fd9dac320` -> public.users.id `f68a646d-97b5-443f-82dd-821fd9dac320`
- `3decde40-73a8-4d48-8bb4-787f624f3087` -> external_id `3728af71-da89-4067-ae60-78a935c6be96` -> public.users.id `3728af71-da89-4067-ae60-78a935c6be96`
- `446468f6-edf7-4b0b-b002-ba01c024a751` -> external_id `964087fb-0022-49d8-a41c-1def2029aba8` -> public.users.id `964087fb-0022-49d8-a41c-1def2029aba8`
- `4608c3ee-92e3-40f9-a10c-76f2a6f35a8b` -> external_id `51beedbe-9b22-4e89-8278-71a8e4adb992` -> public.users.id `51beedbe-9b22-4e89-8278-71a8e4adb992`
- `465bb8da-1114-4a40-b21d-b066bd993904` -> external_id `175a3207-64ce-4fe0-8023-4b21cace6e0a` -> public.users.id `175a3207-64ce-4fe0-8023-4b21cace6e0a`
- `46c82c39-1275-405a-9207-e742d808992d` -> external_id `1bbe86d8-80e2-4a48-ac41-fadb4714bb3d` -> public.users.id `1bbe86d8-80e2-4a48-ac41-fadb4714bb3d`
- `4714d530-1010-417a-8539-6833f939571d` -> external_id `517571ff-2458-4bf9-b07f-11ed09492fa7` -> public.users.id `517571ff-2458-4bf9-b07f-11ed09492fa7`
- `474a20a1-15a6-4a46-ae52-04b3c00f0e8f` -> external_id `a8eebaa5-d7ca-40b6-b158-d3ee6b49b29c` -> public.users.id `a8eebaa5-d7ca-40b6-b158-d3ee6b49b29c`
- `4cc70a8e-5e8d-4303-928a-9bf867f2cbd5` -> external_id `621199be-0800-4222-a2e4-e7f520038aee` -> public.users.id `621199be-0800-4222-a2e4-e7f520038aee`
- `4d51f34e-cb23-4705-83fa-94e18afec00d` -> external_id `6957002f-acba-4303-9add-052403e343dc` -> public.users.id `6957002f-acba-4303-9add-052403e343dc`
- `4fcbd217-4be6-44d3-a7fc-82fd39dffb36` -> external_id `6bc970e2-58c9-4932-bd78-0ec8728d06f7` -> public.users.id `6bc970e2-58c9-4932-bd78-0ec8728d06f7`
- `50d49c4e-77e4-45a7-b7a4-66c0ecba26cb` -> external_id `a184faab-d254-4b13-b37a-bf42c60029b7` -> public.users.id `a184faab-d254-4b13-b37a-bf42c60029b7`
- `5203c1c8-c85e-4501-a834-9fdf9cbc2996` -> external_id `cd1412c3-26d4-4cde-b48f-2e3f9de51e26` -> public.users.id `cd1412c3-26d4-4cde-b48f-2e3f9de51e26`
- `54d6fde7-a770-4c2d-8228-56e048b12731` -> external_id `8b7e6dce-5d03-45b4-9afb-51ca07bd7914` -> public.users.id `8b7e6dce-5d03-45b4-9afb-51ca07bd7914`
- `56f7331e-d19e-4ad7-ac51-5673bd1bcb5d` -> external_id `063caaa9-ed58-4791-ac27-f56d26a83b2f` -> public.users.id `063caaa9-ed58-4791-ac27-f56d26a83b2f`
- `5792985c-c5fc-400f-9589-eb4ea55bb3e3` -> external_id `a2c7f0ac-2468-4be3-9b8b-102a8104a01e` -> public.users.id `a2c7f0ac-2468-4be3-9b8b-102a8104a01e`
- `5ad3fb4a-4dc0-40f7-8bcc-73724547f06e` -> external_id `07e8bdfc-b542-46aa-acc5-b25c4ff19106` -> public.users.id `07e8bdfc-b542-46aa-acc5-b25c4ff19106`
- `602fb11d-e2a3-4a8b-bf3c-c9208d04c7d9` -> external_id `e691c6b0-3488-40ef-86e8-05aa3139c4c6` -> public.users.id `e691c6b0-3488-40ef-86e8-05aa3139c4c6`
- `62bae97a-ab87-48c7-a7a7-a1a3a253289e` -> external_id `9f932037-02b4-430b-ba57-43c36269905a` -> public.users.id `9f932037-02b4-430b-ba57-43c36269905a`
- `62d18176-d201-45db-b105-e1092d967160` -> external_id `28d031d1-03cc-4008-aadd-b1c3aea39a81` -> public.users.id `28d031d1-03cc-4008-aadd-b1c3aea39a81`
- `63297da2-2fd9-41af-8d30-7ca1f7bbb2cf` -> external_id `2dd01f1f-1c5c-447f-b7b3-0a1e9c6eaf89` -> public.users.id `2dd01f1f-1c5c-447f-b7b3-0a1e9c6eaf89`
- `6688c2f4-ce91-4387-90a5-bfd8535d51ea` -> external_id `fc225968-c900-406a-9e1c-db2453929e67` -> public.users.id `fc225968-c900-406a-9e1c-db2453929e67`
- `680f3b88-4499-444a-97c7-1a19ab534acf` -> external_id `9057c878-261b-4f4c-85bd-140f7b3c0f0f` -> public.users.id `9057c878-261b-4f4c-85bd-140f7b3c0f0f`
- `6bd6b5ed-c222-46c6-989f-368a650ce96a` -> external_id `9ba8926a-345b-4488-a80c-23748c4b7ca7` -> public.users.id `9ba8926a-345b-4488-a80c-23748c4b7ca7`
- `6cb93cf8-184c-4af5-8281-fc083ff7091f` -> external_id `aa42b133-057c-41da-85b2-ef1861a8b0a1` -> public.users.id `aa42b133-057c-41da-85b2-ef1861a8b0a1`
- `6cd46900-49dd-4f8d-82cf-897db7002c0a` -> external_id `eedf7994-8c71-4ec9-b676-785cf232f5a1` -> public.users.id `eedf7994-8c71-4ec9-b676-785cf232f5a1`
- `6d793844-6ec1-4fc8-bd48-17248bd04dc8` -> external_id `d3ad19ba-77a9-4e8b-821e-4c5f188d823c` -> public.users.id `d3ad19ba-77a9-4e8b-821e-4c5f188d823c`
- `6fa0624d-243c-41ac-bb8b-ef27c6fdffec` -> external_id `5dddb356-bbbc-42ca-89b1-dc4c8080fa93` -> public.users.id `5dddb356-bbbc-42ca-89b1-dc4c8080fa93`
- `70efbf49-9744-4bb1-9ae5-da70341a0614` -> external_id `a8d5c957-533d-4e15-a988-abcb36a08579` -> public.users.id `a8d5c957-533d-4e15-a988-abcb36a08579`
- `711e278d-ca18-427f-88c6-be4a00a435dd` -> external_id `2c3f3a08-399e-40c4-a1e7-4627050b8576` -> public.users.id `2c3f3a08-399e-40c4-a1e7-4627050b8576`
- `71d6d492-3ec1-4315-acf5-6ad9523cde45` -> external_id `8b9b67a7-0e8e-4576-a6ec-d01bbc1f55fb` -> public.users.id `8b9b67a7-0e8e-4576-a6ec-d01bbc1f55fb`
- `71f98481-f007-4a77-8f7b-877021b42178` -> external_id `f45daec2-f0b2-47a5-b26e-44687947fd06` -> public.users.id `f45daec2-f0b2-47a5-b26e-44687947fd06`
- `72305e9d-736f-415c-8e8b-6e9256eee276` -> external_id `0666e452-1b5a-4193-a423-75fcaea1cc59` -> public.users.id `0666e452-1b5a-4193-a423-75fcaea1cc59`
- `726e7d08-bad0-4bd5-b473-3cdd72ff2802` -> external_id `b57b94a0-1b86-4f06-8f80-1b43eff9ae8d` -> public.users.id `b57b94a0-1b86-4f06-8f80-1b43eff9ae8d`
- `751ac7e5-5914-4966-8bbf-6af72cd38f34` -> external_id `7fcd7bc5-0902-474e-93ba-52b3fca83267` -> public.users.id `7fcd7bc5-0902-474e-93ba-52b3fca83267`
- `7768c505-51c6-431c-95e1-abf2a4d7a171` -> external_id `39cb295f-73ec-4df2-a1b7-1e35f7a1c1c1` -> public.users.id `39cb295f-73ec-4df2-a1b7-1e35f7a1c1c1`
- `77b239b1-69d4-4f98-8d38-4085ac78d727` -> external_id `3fd8cc25-674b-4dea-b3c5-eba063b8093a` -> public.users.id `3fd8cc25-674b-4dea-b3c5-eba063b8093a`
- `791e3a0c-5e17-4555-8e30-47688cf92b14` -> external_id `c458d079-f187-4aa3-b1b5-c45ada777b72` -> public.users.id `c458d079-f187-4aa3-b1b5-c45ada777b72`
- `795105b3-6b61-44bc-ae46-8c96d9c8de69` -> external_id `e6172c1f-9b01-40f7-87ba-e082555f68f1` -> public.users.id `e6172c1f-9b01-40f7-87ba-e082555f68f1`
- `7add05bf-c59e-4e94-b1e2-ee5181e00a12` -> external_id `492ddd62-b34c-43a7-93fb-619a19280c5f` -> public.users.id `492ddd62-b34c-43a7-93fb-619a19280c5f`
- `7cd297e9-3b19-438a-b605-2f9d58f6a95c` -> external_id `9bf7d1d4-2426-4f00-8562-6a19474984ad` -> public.users.id `9bf7d1d4-2426-4f00-8562-6a19474984ad`
- `7cf31419-c04e-4b81-b577-443e68146041` -> external_id `d11c69bc-e0b3-46bf-b313-ff7caf0d0092` -> public.users.id `d11c69bc-e0b3-46bf-b313-ff7caf0d0092`
- `7d245af0-a3e1-4ae5-b69c-884b3cecba78` -> external_id `89df878a-dfb7-4c4a-8809-bb89ad1ba5a8` -> public.users.id `89df878a-dfb7-4c4a-8809-bb89ad1ba5a8`
- `7f555686-1f3b-4b0e-94ec-84cec75d7e5d` -> external_id `55943f89-cb8e-4a43-ba66-726b9f7a69fd` -> public.users.id `55943f89-cb8e-4a43-ba66-726b9f7a69fd`
- `86064cba-b521-4b24-9841-633230df5a14` -> external_id `aae75f29-2946-4dd8-8d72-09763b1ceef3` -> public.users.id `aae75f29-2946-4dd8-8d72-09763b1ceef3`
- `870dde5c-69ff-42d4-b1f2-eb93211c2cdf` -> external_id `e0d03cab-a933-451b-a30d-c27d17336eeb` -> public.users.id `e0d03cab-a933-451b-a30d-c27d17336eeb`
- `8d0bbadc-aca2-44b9-864b-307943103407` -> external_id `56b97176-09cf-4d21-bc9c-93f6e6f90a02` -> public.users.id `56b97176-09cf-4d21-bc9c-93f6e6f90a02`
- `8ee4a0ec-f958-425a-a9da-714a773577a2` -> external_id `7c32ce8a-66b6-4b8f-911a-7c909d1a5bdf` -> public.users.id `7c32ce8a-66b6-4b8f-911a-7c909d1a5bdf`
- `8f9d63b1-126d-46a3-9c24-3add9a7e3a90` -> external_id `89fe3e69-105f-4a5d-9143-26375bc9fd1e` -> public.users.id `89fe3e69-105f-4a5d-9143-26375bc9fd1e`
- `9227781f-8645-4df2-8fac-195964e8a31b` -> external_id `e2f7a04c-6044-4cca-a01a-e7ab3e897970` -> public.users.id `e2f7a04c-6044-4cca-a01a-e7ab3e897970`
- `92ba7358-0151-459d-8354-062dd8be20e4` -> external_id `197f4a23-5c77-42b2-b8a9-3a81fc48f2a2` -> public.users.id `197f4a23-5c77-42b2-b8a9-3a81fc48f2a2`
- `94e774dd-0b20-4edf-8215-a1743ffad2c6` -> external_id `1e57afb4-e364-4438-aa84-1b37e265d227` -> public.users.id `1e57afb4-e364-4438-aa84-1b37e265d227`
- `95cc667e-3573-42cd-ba7e-ca92173fef41` -> external_id `5738f453-5b00-44b8-b7ba-cfcea8995280` -> public.users.id `5738f453-5b00-44b8-b7ba-cfcea8995280`
- `994a16b8-269f-44f5-a05c-35b54ec0e341` -> external_id `3374eef7-2daa-4e93-b1a8-242312dec860` -> public.users.id `3374eef7-2daa-4e93-b1a8-242312dec860`
- `a1721377-a741-4d8d-b47b-902bed758b11` -> external_id `b48b3874-fea1-461e-954d-4e6c480ff4f9` -> public.users.id `b48b3874-fea1-461e-954d-4e6c480ff4f9`
- `a1fb6df4-91d9-4cb6-8988-5442a305bcf2` -> external_id `52edea08-d4ff-42b6-90e1-2cbabc85c83a` -> public.users.id `52edea08-d4ff-42b6-90e1-2cbabc85c83a`
- `a3917b1a-97f0-4050-9542-3c11b82aae08` -> external_id `e9db74ce-e5f9-42be-b9ed-9cf3f7d6ad46` -> public.users.id `e9db74ce-e5f9-42be-b9ed-9cf3f7d6ad46`
- `a39ca4ce-3967-4159-9dc1-5414ec0640f9` -> external_id `b0d712c2-4b3e-4168-abfa-12bed54398b6` -> public.users.id `b0d712c2-4b3e-4168-abfa-12bed54398b6`
- `a6aa3307-a9f9-4900-ac9d-039d1bf6a21f` -> external_id `d1b983b4-865f-4256-ad25-32a153c0bcfc` -> public.users.id `d1b983b4-865f-4256-ad25-32a153c0bcfc`
- `aa094c86-160e-41f1-9eb2-a9c0ea5cb38e` -> external_id `fcf73905-3342-4ac8-8816-25a4c167543b` -> public.users.id `fcf73905-3342-4ac8-8816-25a4c167543b`
- `acd172aa-1e5e-4a6c-9c5c-97cf8f8b4566` -> external_id `50f9ca70-4169-44d1-a051-ce41d1f92535` -> public.users.id `50f9ca70-4169-44d1-a051-ce41d1f92535`
- `ae997877-08e5-47c4-84dc-a6f7fc024774` -> external_id `f4f70d38-c911-4caa-a12f-a8480507e637` -> public.users.id `f4f70d38-c911-4caa-a12f-a8480507e637`
- `b03591b0-8de2-4b07-968d-f6ff0d7ef915` -> external_id `ff8d0fa7-1dd3-44c4-84da-ab15067c4d4c` -> public.users.id `ff8d0fa7-1dd3-44c4-84da-ab15067c4d4c`
- `b07e2726-d2a0-4414-810d-a73caa9da178` -> external_id `2f34eaf1-a7a2-45c0-8ad4-ce3505fff8da` -> public.users.id `2f34eaf1-a7a2-45c0-8ad4-ce3505fff8da`
- `b4a0a2de-c330-4510-a02c-4bfce7734a1c` -> external_id `2ea9996e-c263-4930-9202-5a55a57a7442` -> public.users.id `2ea9996e-c263-4930-9202-5a55a57a7442`
- `b51e09c5-b007-4a77-93bd-e4760131612f` -> external_id `48daa924-f840-4fa6-b37b-82a1ef5e06ec` -> public.users.id `48daa924-f840-4fa6-b37b-82a1ef5e06ec`
- `bc1683a0-fb03-402b-9e56-ee9ea65055cd` -> external_id `3dfaf15f-5b36-4412-929b-519ff21ec028` -> public.users.id `3dfaf15f-5b36-4412-929b-519ff21ec028`
- `bca50e12-83c1-4d55-86d5-a20ce79be0a7` -> external_id `a396bf15-7496-4ee5-a74e-be5fef2c8225` -> public.users.id `a396bf15-7496-4ee5-a74e-be5fef2c8225`
- `bcb94982-f353-43ce-9b61-873f7734a029` -> external_id `58198f97-5de8-4b0b-96f9-6836c55cacce` -> public.users.id `58198f97-5de8-4b0b-96f9-6836c55cacce`
- `bf0088bc-5800-41b8-b49c-f41382c3c127` -> external_id `8fc8a0b3-29a9-4255-af09-43b8f76c2c64` -> public.users.id `8fc8a0b3-29a9-4255-af09-43b8f76c2c64`
- `c00a84d3-ebc0-475b-b692-9f0a2e2fc26c` -> external_id `b814d9fb-5da0-4be4-a20d-e863ff89fb27` -> public.users.id `b814d9fb-5da0-4be4-a20d-e863ff89fb27`
- `c0a45569-f45e-40f5-8d62-d9b477183b39` -> external_id `89fadc1f-0401-4ad4-b7f3-8adddf307332` -> public.users.id `89fadc1f-0401-4ad4-b7f3-8adddf307332`
- `c0b8bf13-9abb-4cd8-846d-5f60e514b90b` -> external_id `3d647d80-b439-4540-ba83-ead1d3213e43` -> public.users.id `3d647d80-b439-4540-ba83-ead1d3213e43`
- `c2015f94-6beb-4a27-a5b4-b99e854e81c1` -> external_id `d880f607-0097-478b-ad3b-308a93bbab05` -> public.users.id `d880f607-0097-478b-ad3b-308a93bbab05`
- `c20a5521-b3ca-4580-ba4b-7e72a118e4c7` -> external_id `eee08eef-efbe-41b7-b47d-03af324cc00d` -> public.users.id `eee08eef-efbe-41b7-b47d-03af324cc00d`
- `c2c20218-db0a-4b3c-b93a-f8ee24be9cab` -> external_id `4d57f367-12db-4e1a-a3ab-cd2c00725c22` -> public.users.id `4d57f367-12db-4e1a-a3ab-cd2c00725c22`
- `c49008b3-346a-4b53-9407-8129941aa175` -> external_id `f899d43d-244e-4f00-b7c7-9ec6e4ac81b1` -> public.users.id `f899d43d-244e-4f00-b7c7-9ec6e4ac81b1`
- `c5b7eed6-d565-4626-8168-8d45610aedeb` -> external_id `f23a9164-a0fd-459b-90f7-e9efb871836b` -> public.users.id `f23a9164-a0fd-459b-90f7-e9efb871836b`
- `c6d0fa6d-5da5-4ac5-81dc-a409a2cf7c9e` -> external_id `8e2f9a31-781a-464f-a4cb-9daa54693089` -> public.users.id `8e2f9a31-781a-464f-a4cb-9daa54693089`
- `c9ab9a79-6566-48bf-806b-c584e04d3ae2` -> external_id `7c46edd0-5107-4a64-abee-cd188ae4b35d` -> public.users.id `7c46edd0-5107-4a64-abee-cd188ae4b35d`
- `ca05be7a-12db-47f3-a049-8bff88d961c0` -> external_id `e590a1eb-e3a9-46da-8843-f5057c0483fa` -> public.users.id `e590a1eb-e3a9-46da-8843-f5057c0483fa`
- `cfc21aa9-3fd7-41f4-9bb3-20ed12374b30` -> external_id `b35da046-ed01-40dc-a700-c911f543d14f` -> public.users.id `b35da046-ed01-40dc-a700-c911f543d14f`
- `d08ffe83-56b8-4579-9ef7-c364d028792e` -> external_id `b149ef19-5007-4167-a103-878c05aa2891` -> public.users.id `b149ef19-5007-4167-a103-878c05aa2891`
- `d31adfc6-c18e-446b-940d-5048cd6da80b` -> external_id `916f6101-c36d-44cb-9184-dc46912cbaaf` -> public.users.id `916f6101-c36d-44cb-9184-dc46912cbaaf`
- `d41fe5e4-75dd-48d1-8424-8b43a05df77e` -> external_id `c1520bcc-1780-47b5-a43c-06947f22cba6` -> public.users.id `c1520bcc-1780-47b5-a43c-06947f22cba6`
- `d730f12d-2f70-4b7f-a9a2-bc14ee6f30c4` -> external_id `9c465ac9-348b-428c-8d8c-dbcb823270e0` -> public.users.id `9c465ac9-348b-428c-8d8c-dbcb823270e0`
- `d8134bfe-569c-4b3e-9b1e-8ebcd5ced048` -> external_id `a03933b9-dc1c-4924-9219-2e281e98dd70` -> public.users.id `a03933b9-dc1c-4924-9219-2e281e98dd70`
- `d843b642-a9bb-44f6-8b19-985ec4927c7d` -> external_id `b7151c60-d318-4c70-bdcc-6ea0c16b080a` -> public.users.id `b7151c60-d318-4c70-bdcc-6ea0c16b080a`
- `d8b7bd42-cd00-4b65-80ac-c2fe856df6d1` -> external_id `8e9571eb-f2ad-42cf-8f77-6c80da633cee` -> public.users.id `8e9571eb-f2ad-42cf-8f77-6c80da633cee`
- `dab16ab6-a30f-4165-9c37-966c542b1249` -> external_id `4004a6f6-d68b-43d9-ba71-26ff0ae7fc1d` -> public.users.id `4004a6f6-d68b-43d9-ba71-26ff0ae7fc1d`
- `df07e54d-7365-48b5-a56c-92d352095448` -> external_id `429ed925-d513-45a0-b2f7-379b96cec5e1` -> public.users.id `429ed925-d513-45a0-b2f7-379b96cec5e1`
- `e04ad72f-2435-42c3-b62d-fc8372320982` -> external_id `4076b382-bf07-46fb-9a62-715b60477392` -> public.users.id `4076b382-bf07-46fb-9a62-715b60477392`
- `e1176e04-446b-4141-a9df-d6af6bd27bf6` -> external_id `a8f8582d-324b-4745-b11c-fba3fa3ab723` -> public.users.id `a8f8582d-324b-4745-b11c-fba3fa3ab723`
- `e4f1287c-0c20-495e-b2d1-1f756b58876a` -> external_id `7c6fb215-0d88-467c-9ae0-28ced0d3690b` -> public.users.id `7c6fb215-0d88-467c-9ae0-28ced0d3690b`
- `e5d77ddd-f7cf-401b-9c51-37dae14001a4` -> external_id `7c403f40-f302-4525-a6fd-19819731f5a2` -> public.users.id `7c403f40-f302-4525-a6fd-19819731f5a2`
- `ede4cdcf-efc0-48ad-984a-761f0d6bfbd8` -> external_id `9ea3f070-fc36-4eb4-976c-16878fe0b7ee` -> public.users.id `9ea3f070-fc36-4eb4-976c-16878fe0b7ee`
- `ee62d3d8-7fc2-418b-b3a3-563cbe0acee1` -> external_id `9b6f4e6d-c2f7-4e17-abd1-15fe14b84584` -> public.users.id `9b6f4e6d-c2f7-4e17-abd1-15fe14b84584`
- `eefa7798-826e-445c-bf21-5a02db029b04` -> external_id `8ccd48a4-ce54-48d9-b713-9e441a21047e` -> public.users.id `8ccd48a4-ce54-48d9-b713-9e441a21047e`
- `f27c265f-56ac-4eb3-99e4-5e6377e05a0f` -> external_id `7b44f12b-6ae8-4809-aed3-2a5f396f28a9` -> public.users.id `7b44f12b-6ae8-4809-aed3-2a5f396f28a9`
- `f36c9ed7-414d-4132-b898-349fb10d2735` -> external_id `3728c2f4-0edf-4a1b-a4f6-e16442f90dca` -> public.users.id `3728c2f4-0edf-4a1b-a4f6-e16442f90dca`
- `f53cdbbb-b07e-4bc7-951e-4a7c744368c2` -> external_id `363ed565-67c8-47fb-b151-fd69823535d3` -> public.users.id `363ed565-67c8-47fb-b151-fd69823535d3`
- `f6e92a97-5622-4ac8-bf5e-49d3069200e1` -> external_id `237da3c8-10c9-4df3-9f48-cb74305f6004` -> public.users.id `237da3c8-10c9-4df3-9f48-cb74305f6004`
- `f72f8291-a7bc-4cfc-b42a-fc3a60afb8b7` -> external_id `02224949-2c57-45aa-864f-cc72de0959dc` -> public.users.id `02224949-2c57-45aa-864f-cc72de0959dc`
- `f7a18f96-fef4-4683-ba2f-9d4e9495328e` -> external_id `25e157f4-e64d-46d1-a6fc-15885f910bd9` -> public.users.id `25e157f4-e64d-46d1-a6fc-15885f910bd9`
- `fba7f299-eee8-4ab9-8229-1561a585e3cb` -> external_id `629be9f7-97f8-438e-9eba-206818ef7192` -> public.users.id `629be9f7-97f8-438e-9eba-206818ef7192`
- `fe510dbb-ca91-4191-b6d1-2ad573dd4629` -> external_id `a8efde7f-2707-42ca-a483-394afce7d459` -> public.users.id `a8efde7f-2707-42ca-a483-394afce7d459`

Unresolved or non-confirmed traders:
- `01e0c8e4-9985-43ac-965d-fccef487bcd4` external_id `inttest-user-1783239091589`, email `inttest@fundedwealth.com`, accounts: 4; exact public.users candidates: none; email-only candidates: none.
- `a99a47f0-61e1-4503-be5d-b06119fd42d7` external_id `test-user-runtime-001`, email `test@runtime.com`, accounts: 1; exact public.users candidates: none; email-only candidates: none.
- `d4ae354b-3048-43c7-a6d6-1b44b93867f6` external_id `ext_59e4a6b77dc1a989`, email `razorpay-test@fundedwealth.com`, accounts: 4; exact public.users candidates: none; email-only candidates: none.
- `f825ff08-4431-448c-aceb-c22bbf08e536` external_id `ext_2b92969925dc16ab`, email `manual-pay@fundedwealth.com`, accounts: 4; exact public.users candidates: none; email-only candidates: none.

## Staff Auth -> staff_members

- `00000000-0000-0000-0000-000000000001` email `adminfundedwealth@gmail.com`: **UNRESOLVED**; direct Auth candidates: none; email candidates: 77bde6e8-2e81-4427-8a8e-f856e680fa53.

The active authentication code checks authenticated Supabase user ID against `staff_members.id`. This report does not modify that code.

## Account ownership

- Accounts examined: 102
- Valid `trading_accounts.trader_id -> terminal_traders.id` ownership: 102
- Orphan accounts: 0
- Accounts attached to unresolved/ambiguous traders: 13
- Traders with multiple accounts:
- `4cc70a8e-5e8d-4303-928a-9bf867f2cbd5`: 3 accounts
- `6cb93cf8-184c-4af5-8281-fc083ff7091f`: 2 accounts
- `f825ff08-4431-448c-aceb-c22bbf08e536`: 4 accounts
- `94e774dd-0b20-4edf-8215-a1743ffad2c6`: 2 accounts
- `791e3a0c-5e17-4555-8e30-47688cf92b14`: 6 accounts
- `d4ae354b-3048-43c7-a6d6-1b44b93867f6`: 4 accounts
- `01e0c8e4-9985-43ac-965d-fccef487bcd4`: 4 accounts
- `0a05f016-a575-4d84-86e2-7035e3a00b56`: 2 accounts
- `e4f1287c-0c20-495e-b2d1-1f756b58876a`: 3 accounts
- `465bb8da-1114-4a40-b21d-b066bd993904`: 2 accounts
- `a6aa3307-a9f9-4900-ac9d-039d1bf6a21f`: 2 accounts
- `f7a18f96-fef4-4683-ba2f-9d4e9495328e`: 3 accounts
- `f53cdbbb-b07e-4bc7-951e-4a7c744368c2`: 2 accounts
- `222fe8e0-be22-497f-9f45-debc856be0d2`: 3 accounts

## Migration rule

Only **CONFIRMED** identity relationships may later be eligible for automated migration. Email-only candidates, unresolved records, ambiguous records, and records from the inaccessible New Terminal project remain manual decisions.

## Access limitations

- The canonical SQL RPC was unavailable through the REST surface, so FK enforcement could not be independently verified.
- Auth admin data was available read-only; public.users data was available read-only.
- New Terminal protected rows were not queried with a privileged credential. No cross-project record was classified as duplicate or migratable.
